require('dotenv').config();
const db = require('./db');
const auth = require('./auth');
const storage = require('./storage');
const itinerary = require('./itinerary');
const weather = require('./weather');

/**
 * Standard API response helper
 */
function sendResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Parse JSON body safely
 */
function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
  } catch (e) {
    return {};
  }
}

/**
 * Main Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Extract path: handles both /.netlify/functions/api/... and /api/...
  let path = event.path || '';
  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  const method = event.httpMethod.toUpperCase();
  const isProduction = process.env.NODE_ENV === 'production';
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '127.0.0.1';

  try {
    // ==========================================
    // 1. AUTH ROUTES
    // ==========================================

    // GET /api/auth/friends -> list all members for dropdown
    if (method === 'GET' && path === '/auth/friends') {
      const res = await db.query('SELECT f_id, name FROM friends ORDER BY f_id ASC');
      const friends = res.rows.map(r => ({
        f_id: r.f_id.trim(),
        name: r.name
      }));
      return sendResponse(200, { ok: true, friends });
    }

    // POST /api/auth/login -> member login with shared password
    if (method === 'POST' && path === '/auth/login') {
      const { f_id, password } = parseBody(event);
      if (!f_id || !password) {
        return sendResponse(400, { ok: false, error: 'กรุณาเลือกชื่อและระบุรหัสผ่านนะ' });
      }

      // Check rate limit
      const rateLimit = auth.checkRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return sendResponse(429, { ok: false, error: rateLimit.message });
      }

      // Verify member exists
      const friendRes = await db.query('SELECT f_id, name FROM friends WHERE TRIM(f_id) = $1', [f_id.trim()]);
      if (friendRes.rows.length === 0) {
        return sendResponse(404, { ok: false, error: 'ไม่พบรายชื่อสมาชิกนี้ในระบบ' });
      }

      // Verify shared password
      const isValid = await auth.verifyPassword(password);
      if (!isValid) {
        auth.recordFailedAttempt(clientIp);
        return sendResponse(401, { ok: false, error: 'รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้งนะ' });
      }

      // Clear failed attempts on success
      auth.clearRateLimit(clientIp);

      // Create new session
      const userAgent = event.headers['user-agent'] || '';
      const sessionId = await auth.createSession(f_id, userAgent, clientIp);
      const cookieHeader = auth.createSessionCookie(sessionId, isProduction);

      return sendResponse(200, {
        ok: true,
        user: {
          f_id: friendRes.rows[0].f_id.trim(),
          name: friendRes.rows[0].name
        }
      }, {
        'Set-Cookie': cookieHeader
      });
    }

    // POST /api/auth/logout -> end current session
    if (method === 'POST' && path === '/auth/logout') {
      const sessionId = auth.getSessionIdFromRequest(event);
      if (sessionId) {
        await auth.destroySession(sessionId);
      }
      return sendResponse(200, { ok: true }, {
        'Set-Cookie': auth.clearSessionCookie(isProduction)
      });
    }

    // GET /api/auth/me -> check authentication status
    if (method === 'GET' && path === '/auth/me') {
      const user = await auth.getAuthUser(event);
      if (!user) {
        return sendResponse(200, { authenticated: false });
      }
      return sendResponse(200, { authenticated: true, user });
    }

    // ==========================================
    // Middleware: Require Auth for data routes
    // ==========================================
    const user = await auth.getAuthUser(event);
    if (!user) {
      return sendResponse(401, { ok: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งานนะ' });
    }

    // ==========================================
    // 2. TRIP & PROJECT SETTINGS
    // ==========================================

    // GET /api/trip -> get current trip dates
    if (method === 'GET' && path === '/trip') {
      const res = await db.query(
        'SELECT setting_id, trip_start_date, trip_end_date, updated_at FROM trip_settings WHERE setting_id = 1'
      );
      const row = res.rows[0] || null;
      return sendResponse(200, { ok: true, trip: row });
    }

    // PUT /api/trip -> update trip dates + audit log
    if (method === 'PUT' && path === '/trip') {
      const { trip_start_date, trip_end_date } = parseBody(event);
      
      const currentRes = await db.query('SELECT trip_start_date, trip_end_date FROM trip_settings WHERE setting_id = 1');
      const current = currentRes.rows[0] || {};

      // Validate dates
      if (trip_start_date && trip_end_date && trip_start_date > trip_end_date) {
        return sendResponse(400, { ok: false, error: 'วันเริ่มต้นทริปต้องไม่เกินวันสิ้นสุดทริปนะ' });
      }

      await db.query(
        `UPDATE trip_settings 
         SET trip_start_date = $1, trip_end_date = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_id = 1`,
        [trip_start_date || null, trip_end_date || null]
      );

      // Record Audit Log
      await db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, old_values, new_values, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'trip_settings',
          '1',
          'update',
          user.f_id,
          JSON.stringify(current),
          JSON.stringify({ trip_start_date, trip_end_date }),
          'แก้ไขวันเดินทางของทริป'
        ]
      );

      return sendResponse(200, { ok: true, message: 'บันทึกวันทริปเรียบร้อยแล้ว' });
    }

    // ==========================================
    // 3. ITINERARY & PLACES
    // ==========================================

    if (method === 'GET' && path === '/itinerary') {
      const days = itinerary.getItinerary();
      return sendResponse(200, { ok: true, days });
    }

    if (method === 'GET' && path === '/places') {
      const places = itinerary.getPlaces();
      return sendResponse(200, { ok: true, places });
    }

    // ==========================================
    // 4. WEATHER
    // ==========================================

    if (method === 'GET' && path === '/weather') {
      const qs = event.queryStringParameters || {};
      const lat = parseFloat(qs.lat) || 12.92297; // Default Koh Lan
      const lng = parseFloat(qs.lng) || 100.78881;
      const targetDate = qs.date || null;

      const forecast = await weather.getForecast(lat, lng, targetDate);
      return sendResponse(200, forecast);
    }

    // ==========================================
    // 5. NOTIFICATIONS
    // ==========================================

    if (method === 'GET' && path === '/notifications') {
      const notifsRes = await db.query(
        `SELECT n.notification_id, n.event_type, n.title, n.message, n.actor_f_id, n.action_link, n.created_at,
                (nr.read_at IS NOT NULL) AS is_read
         FROM notifications n
         LEFT JOIN notification_reads nr ON nr.notification_id = n.notification_id AND nr.f_id = $1
         WHERE n.target_f_id IS NULL OR n.target_f_id = $1
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [user.f_id]
      );

      const unreadCountRes = await db.query(
        `SELECT COUNT(*) AS unread_count
         FROM notifications n
         LEFT JOIN notification_reads nr ON nr.notification_id = n.notification_id AND nr.f_id = $1
         WHERE (n.target_f_id IS NULL OR n.target_f_id = $1) AND nr.read_at IS NULL`,
        [user.f_id]
      );

      return sendResponse(200, {
        ok: true,
        notifications: notifsRes.rows,
        unreadCount: parseInt(unreadCountRes.rows[0].unread_count, 10) || 0
      });
    }

    if (method === 'POST' && path === '/notifications/read') {
      const { notification_id } = parseBody(event);
      if (notification_id) {
        await db.query(
          `INSERT INTO notification_reads (notification_id, f_id, read_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (notification_id, f_id) DO NOTHING`,
          [notification_id, user.f_id]
        );
      } else {
        // Mark all as read
        await db.query(
          `INSERT INTO notification_reads (notification_id, f_id, read_at)
           SELECT notification_id, $1, CURRENT_TIMESTAMP
           FROM notifications
           ON CONFLICT (notification_id, f_id) DO NOTHING`,
          [user.f_id]
        );
      }
      return sendResponse(200, { ok: true });
    }

    // ==========================================
    // 6. FINANCE: OVERVIEW
    // ==========================================

    if (method === 'GET' && path === '/finance/overview') {
      // 1. Central fund total (excluding void)
      const cfRes = await db.query(
        `SELECT COALESCE(SUM(amount_c), 0) AS total FROM central_fund WHERE is_void IS NOT TRUE`
      );
      const centralFundTotal = parseFloat(cfRes.rows[0].total);

      // Central fund by member
      const cfByMemberRes = await db.query(
        `SELECT f.f_id, f.name, COALESCE(SUM(c.amount_c), 0) AS amount
         FROM friends f
         LEFT JOIN central_fund c ON TRIM(c.f_id) = TRIM(f.f_id) AND c.is_void IS NOT TRUE
         GROUP BY f.f_id, f.name
         ORDER BY f.f_id ASC`
      );

      // 2. Expenses total (excluding void)
      const expRes = await db.query(
        `SELECT COALESCE(SUM(amount_e), 0) AS total FROM expenses WHERE is_void IS NOT TRUE`
      );
      const expensesTotal = parseFloat(expRes.rows[0].total);

      // Expenses paid by member
      const expByMemberRes = await db.query(
        `SELECT f.f_id, f.name, COALESCE(SUM(e.amount_e), 0) AS amount
         FROM friends f
         LEFT JOIN expenses e ON TRIM(e.f_id) = TRIM(f.f_id) AND e.is_void IS NOT TRUE
         GROUP BY f.f_id, f.name
         ORDER BY f.f_id ASC`
      );

      // Expenses by category
      const expByCategoryRes = await db.query(
        `SELECT COALESCE(type, 'อื่นๆ') AS type, COALESCE(SUM(amount_e), 0) AS amount
         FROM expenses
         WHERE is_void IS NOT TRUE
         GROUP BY type
         ORDER BY amount DESC`
      );

      // 3. Debts list: sum of unpaid split items (where debtor != creditor and settlement_id is null and is_void is false)
      const debtsRes = await db.query(
        `SELECT 
            es.f_id AS debtor_id,
            debtor.name AS debtor_name,
            e.f_id AS creditor_id,
            creditor.name AS creditor_name,
            COALESCE(SUM(es.amount_r), 0) AS total_debt,
            COUNT(es.expenses_split_id) AS split_count
         FROM expenses_split es
         JOIN expenses e ON TRIM(e.expenses_id) = TRIM(es.expenses_id)
         JOIN friends debtor ON TRIM(debtor.f_id) = TRIM(es.f_id)
         JOIN friends creditor ON TRIM(creditor.f_id) = TRIM(e.f_id)
         WHERE es.is_void IS NOT TRUE 
           AND e.is_void IS NOT TRUE 
           AND es.settlement_id IS NULL
           AND TRIM(es.f_id) != TRIM(e.f_id)
         GROUP BY es.f_id, debtor.name, e.f_id, creditor.name
         ORDER BY total_debt DESC`
      );

      const totalDebt = debtsRes.rows.reduce((sum, r) => sum + parseFloat(r.total_debt), 0);

      // 4. Personal summary for current logged-in user
      const myCf = cfByMemberRes.rows.find(r => r.f_id.trim() === user.f_id);
      const myExp = expByMemberRes.rows.find(r => r.f_id.trim() === user.f_id);

      // Debts current user owes to others
      const myDebtsToPay = debtsRes.rows
        .filter(r => r.debtor_id.trim() === user.f_id)
        .reduce((sum, r) => sum + parseFloat(r.total_debt), 0);

      // Debts others owe to current user
      const myDebtsToReceive = debtsRes.rows
        .filter(r => r.creditor_id.trim() === user.f_id)
        .reduce((sum, r) => sum + parseFloat(r.total_debt), 0);

      return sendResponse(200, {
        ok: true,
        centralFundTotal,
        expensesTotal,
        totalDebt,
        centralFundByMember: cfByMemberRes.rows.map(r => ({
          f_id: r.f_id.trim(),
          name: r.name,
          amount: parseFloat(r.amount)
        })),
        expensesByMember: expByMemberRes.rows.map(r => ({
          f_id: r.f_id.trim(),
          name: r.name,
          amount: parseFloat(r.amount)
        })),
        expensesByCategory: expByCategoryRes.rows.map(r => ({
          type: r.type,
          amount: parseFloat(r.amount)
        })),
        debtsSummary: debtsRes.rows.map(r => ({
          debtor_id: r.debtor_id.trim(),
          debtor_name: r.debtor_name,
          creditor_id: r.creditor_id.trim(),
          creditor_name: r.creditor_name,
          total_debt: parseFloat(r.total_debt),
          split_count: parseInt(r.split_count, 10)
        })),
        mySummary: {
          centralFundPaid: myCf ? parseFloat(myCf.amount) : 0,
          expensesPaid: myExp ? parseFloat(myExp.amount) : 0,
          debtsToPay: myDebtsToPay,
          debtsToReceive: myDebtsToReceive
        }
      });
    }

    // ==========================================
    // 7. FINANCE: CENTRAL FUND
    // ==========================================

    if (method === 'GET' && path === '/finance/central-fund') {
      const res = await db.query(
        `SELECT c.slips_id, c.f_id, f.name AS member_name, c.date, c.amount_c, c.url_c, 
                c.is_void, c.void_reason, c.void_by, c.void_at, c.created_at
         FROM central_fund c
         JOIN friends f ON TRIM(f.f_id) = TRIM(c.f_id)
         ORDER BY c.created_at DESC, c.slips_id DESC`
      );

      // Generate signed URLs for slips
      const items = await Promise.all(res.rows.map(async r => {
        let signedUrl = null;
        if (r.url_c && r.url_c.trim()) {
          signedUrl = await storage.getSignedSlipUrl(r.url_c.trim());
        }
        return {
          slips_id: r.slips_id.trim(),
          f_id: r.f_id.trim(),
          member_name: r.member_name,
          date: r.date,
          amount_c: parseFloat(r.amount_c),
          url_c: r.url_c ? r.url_c.trim() : null,
          signed_url: signedUrl,
          is_void: Boolean(r.is_void),
          void_reason: r.void_reason,
          created_at: r.created_at
        };
      }));

      return sendResponse(200, { ok: true, items });
    }

    if (method === 'POST' && path === '/finance/central-fund') {
      const { amount, date, slip_file, original_filename, mime_type } = parseBody(event);
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุจำนวนเงินที่ถูกต้องนะ' });
      }

      if (!slip_file) {
        return sendResponse(400, { ok: false, error: 'การเติมเงินกองกลางต้องแนบสลิปด้วยนะ' });
      }

      // Upload slip
      const fileBuffer = Buffer.from(slip_file, 'base64');
      const storagePath = await storage.uploadSlip(fileBuffer, original_filename || 'slip.jpg', mime_type || 'image/jpeg', 'central_fund');

      // Generate slips_id: e.g. CF00000001 (10 chars)
      const countRes = await db.query('SELECT COUNT(*) FROM central_fund');
      const nextIdNum = parseInt(countRes.rows[0].count, 10) + 1;
      const slips_id = `CF${String(nextIdNum).padStart(8, '0')}`.substring(0, 10);

      const txDate = date || new Date().toISOString().split('T')[0];

      await db.query(
        `INSERT INTO central_fund (slips_id, f_id, date, amount_c, url_c, is_void, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)`,
        [slips_id, user.f_id, txDate, numAmount, storagePath]
      );

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, new_values, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'central_fund',
          slips_id,
          'create',
          user.f_id,
          JSON.stringify({ slips_id, f_id: user.f_id, amount: numAmount, date: txDate, url: storagePath }),
          'สมาชิกเติมเงินกองกลาง'
        ]
      );

      // Notification
      await db.query(
        `INSERT INTO notifications (event_type, title, message, actor_f_id, action_link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'central_fund_added',
          'มีเพื่อนเติมเงินกองกลาง 💰',
          `${user.name} ได้เติมเงินกองกลางจำนวน ${numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
          user.f_id,
          '#finance/central-fund'
        ]
      );

      return sendResponse(200, { ok: true, message: 'บันทึกรายการเงินกองกลางเรียบร้อยแล้ว' });
    }

    // POST /api/finance/central-fund/void
    if (method === 'POST' && path === '/finance/central-fund/void') {
      const { slips_id, reason } = parseBody(event);
      if (!slips_id || !reason) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุรหัสรายการและเหตุผลในการยกเลิกนะ' });
      }

      const itemRes = await db.query('SELECT * FROM central_fund WHERE TRIM(slips_id) = $1', [slips_id.trim()]);
      if (itemRes.rows.length === 0) {
        return sendResponse(404, { ok: false, error: 'ไม่พบรายการนี้' });
      }

      const item = itemRes.rows[0];
      if (item.f_id.trim() !== user.f_id) {
        return sendResponse(403, { ok: false, error: 'เฉพาะเจ้าของรายการเท่านั้นที่สามารถยกเลิกรายการนี้ได้นะ' });
      }

      if (item.is_void) {
        return sendResponse(400, { ok: false, error: 'รายการนี้ถูกยกเลิกไปแล้ว' });
      }

      await db.query(
        `UPDATE central_fund 
         SET is_void = TRUE, void_reason = $1, void_by = $2, void_at = CURRENT_TIMESTAMP
         WHERE TRIM(slips_id) = $3`,
        [reason, user.f_id, slips_id.trim()]
      );

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, old_values, new_values, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'central_fund',
          slips_id.trim(),
          'void',
          user.f_id,
          JSON.stringify(item),
          JSON.stringify({ is_void: true, void_reason: reason, void_by: user.f_id }),
          reason
        ]
      );

      return sendResponse(200, { ok: true, message: 'ยกเลิกรายการเงินกองกลางเรียบร้อยแล้ว' });
    }

    // ==========================================
    // 8. FINANCE: EXPENSES & SPLIT
    // ==========================================

    // GET /api/finance/expenses
    if (method === 'GET' && path === '/finance/expenses') {
      const expRes = await db.query(
        `SELECT e.expenses_id, e.f_id, f.name AS payer_name, e.type, e.date, e.amount_e, 
                e.url_e, e.description, e.is_void, e.void_reason, e.created_at
         FROM expenses e
         JOIN friends f ON TRIM(f.f_id) = TRIM(e.f_id)
         ORDER BY e.created_at DESC, e.expenses_id DESC`
      );

      // Get splits for all expenses
      const splitsRes = await db.query(
        `SELECT es.expenses_split_id, es.expenses_id, es.f_id, f.name AS participant_name, 
                es.amount_r, es.settlement_id, es.is_void
         FROM expenses_split es
         JOIN friends f ON TRIM(f.f_id) = TRIM(es.f_id)
         WHERE es.is_void IS NOT TRUE
         ORDER BY es.expenses_split_id ASC`
      );

      const splitsByExp = {};
      splitsRes.rows.forEach(s => {
        const eid = s.expenses_id.trim();
        if (!splitsByExp[eid]) splitsByExp[eid] = [];
        splitsByExp[eid].push({
          expenses_split_id: s.expenses_split_id.trim(),
          f_id: s.f_id.trim(),
          participant_name: s.participant_name,
          amount_r: parseFloat(s.amount_r),
          settlement_id: s.settlement_id ? s.settlement_id.trim() : null
        });
      });

      const expenses = await Promise.all(expRes.rows.map(async r => {
        const eid = r.expenses_id.trim();
        let signedUrl = null;
        if (r.url_e && r.url_e.trim()) {
          signedUrl = await storage.getSignedSlipUrl(r.url_e.trim());
        }
        const splits = splitsByExp[eid] || [];
        const hasSplits = splits.length > 0;
        const hasSettledDebt = splits.some(s => s.settlement_id !== null);

        return {
          expenses_id: eid,
          f_id: r.f_id.trim(),
          payer_name: r.payer_name,
          type: r.type,
          date: r.date,
          amount_e: parseFloat(r.amount_e),
          url_e: r.url_e ? r.url_e.trim() : null,
          signed_url: signedUrl,
          description: r.description,
          is_void: Boolean(r.is_void),
          void_reason: r.void_reason,
          created_at: r.created_at,
          splits,
          hasSplits,
          hasSettledDebt
        };
      }));

      return sendResponse(200, { ok: true, expenses });
    }

    // POST /api/finance/expenses -> create expense
    if (method === 'POST' && path === '/finance/expenses') {
      const { type, amount, date, description, slip_file, original_filename, mime_type } = parseBody(event);
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุจำนวนเงินที่ถูกต้องนะ' });
      }

      // Check slip or description requirement
      if (!slip_file && (!description || !description.trim())) {
        return sendResponse(400, { ok: false, error: 'หากไม่มีสลิป ต้องกรอกคำอธิบาย (Description) เพิ่มเติมด้วยนะ' });
      }

      let storagePath = null;
      if (slip_file) {
        const fileBuffer = Buffer.from(slip_file, 'base64');
        storagePath = await storage.uploadSlip(fileBuffer, original_filename || 'expense.jpg', mime_type || 'image/jpeg', 'expenses');
      }

      // Generate expenses_id: EX00000001 (10 chars)
      const countRes = await db.query('SELECT COUNT(*) FROM expenses');
      const nextIdNum = parseInt(countRes.rows[0].count, 10) + 1;
      const expenses_id = `EX${String(nextIdNum).padStart(8, '0')}`.substring(0, 10);

      const txDate = date || new Date().toISOString().split('T')[0];

      await db.query(
        `INSERT INTO expenses (expenses_id, f_id, type, date, amount_e, url_e, description, is_void, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, CURRENT_TIMESTAMP)`,
        [expenses_id, user.f_id, type || 'อื่นๆ', txDate, numAmount, storagePath, description || null]
      );

      // Audit Log
      await db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, new_values, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'expense',
          expenses_id,
          'create',
          user.f_id,
          JSON.stringify({ expenses_id, f_id: user.f_id, type, amount: numAmount, date: txDate, description, url: storagePath }),
          'สมาชิกบันทึกค่าใช้จ่ายสำรองจ่าย'
        ]
      );

      // Notification
      await db.query(
        `INSERT INTO notifications (event_type, title, message, actor_f_id, action_link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'expense_created',
          'มีเพื่อนบันทึกค่าใช้จ่ายใหม่ 🧾',
          `${user.name} ได้สำรองจ่าย ${type || 'ค่าใช้จ่าย'} จำนวน ${numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
          user.f_id,
          '#finance/expenses'
        ]
      );

      return sendResponse(200, { ok: true, expenses_id, message: 'บันทึกค่าใช้จ่ายเรียบร้อยแล้ว' });
    }

    // POST /api/finance/expenses/split -> split an expense
    if (method === 'POST' && path === '/finance/expenses/split') {
      const { expenses_id, split_mode, participants } = parseBody(event);
      
      if (!expenses_id || !Array.isArray(participants) || participants.length === 0) {
        return sendResponse(400, { ok: false, error: 'ข้อมูลการแบ่งค่าใช้จ่ายไม่ถูกต้อง' });
      }

      // Fetch expense
      const expRes = await db.query('SELECT * FROM expenses WHERE TRIM(expenses_id) = $1', [expenses_id.trim()]);
      if (expRes.rows.length === 0) {
        return sendResponse(404, { ok: false, error: 'ไม่พบรายการค่าใช้จ่ายนี้' });
      }
      const expense = expRes.rows[0];
      if (expense.f_id.trim() !== user.f_id) {
        return sendResponse(403, { ok: false, error: 'เฉพาะผู้จ่ายเงินเท่านั้นที่สามารถแบ่งค่าใช้จ่ายนี้ได้นะ' });
      }

      // Check if already split with settled debts
      const checkSettled = await db.query(
        `SELECT COUNT(*) FROM expenses_split 
         WHERE TRIM(expenses_id) = $1 AND settlement_id IS NOT NULL AND is_void IS NOT TRUE`,
        [expenses_id.trim()]
      );
      if (parseInt(checkSettled.rows[0].count, 10) > 0) {
        return sendResponse(400, { ok: false, error: 'มีหนี้ที่ชำระไปแล้ว ไม่สามารถแก้ไขหรือแบ่งค่าใช้จ่ายใหม่ได้' });
      }

      const totalAmount = parseFloat(expense.amount_e);
      const payerId = expense.f_id.trim();

      // Ensure payer is included in participants
      const participantIds = Array.from(new Set(participants.map(p => (typeof p === 'string' ? p : p.f_id).trim())));
      if (!participantIds.includes(payerId)) {
        participantIds.push(payerId);
      }

      const n = participantIds.length;
      let splitRows = [];

      if (split_mode === 'custom') {
        // Custom split: participants is array of { f_id, amount }
        let sumCustom = 0;
        participants.forEach(p => { sumCustom += parseFloat(p.amount || 0); });
        
        // Exact sum check before ceiling
        if (Math.abs(sumCustom - totalAmount) > 0.01) {
          return sendResponse(400, { 
            ok: false, 
            error: `ผลรวมยอดแบ่ง (${sumCustom}) ต้องเท่ากับยอดจริง (${totalAmount}) ก่อนการปัดเศษนะ` 
          });
        }

        splitRows = participants.map(p => {
          const rawAmt = parseFloat(p.amount);
          // Ceiling to integer baht per rule: Math.ceil
          const ceilAmt = Math.ceil(rawAmt);
          return {
            f_id: p.f_id.trim(),
            raw_amount: rawAmt,
            amount_r: ceilAmt
          };
        });
      } else {
        // Equal split: totalAmount / n, rounded UP to integer baht
        // e.g. 1000 / 3 = 333.333 -> ceil = 334 baht each
        const rawShare = totalAmount / n;
        const ceilShare = Math.ceil(rawShare);

        splitRows = participantIds.map(fid => ({
          f_id: fid,
          raw_amount: rawShare,
          amount_r: ceilShare
        }));
      }

      // Execute within DB Transaction: delete old splits for this expense, insert new splits
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Delete old unpaid splits
        await client.query('DELETE FROM expenses_split WHERE TRIM(expenses_id) = $1', [expenses_id.trim()]);

        // Insert new splits
        const countRes = await client.query('SELECT COUNT(*) FROM expenses_split');
        let nextSplitNum = parseInt(countRes.rows[0].count, 10) + 1;

        for (const row of splitRows) {
          const splitId = `ES${String(nextSplitNum++).padStart(8, '0')}`.substring(0, 10);
          await client.query(
            `INSERT INTO expenses_split (expenses_split_id, f_id, amount_r, expenses_id, settlement_id, is_void)
             VALUES ($1, $2, $3, $4, NULL, FALSE)`,
            [splitId, row.f_id, row.amount_r, expenses_id.trim()]
          );
        }

        // Audit Log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, new_values, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'expense_split',
            expenses_id.trim(),
            'create',
            user.f_id,
            JSON.stringify({ expenses_id: expenses_id.trim(), splits: splitRows }),
            'แบ่งค่าใช้จ่ายและสร้างรายการหนี้'
          ]
        );

        // Notification for involved members
        await client.query(
          `INSERT INTO notifications (event_type, title, message, actor_f_id, action_link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            'debt_created',
            'มีการแบ่งค่าใช้จ่ายใหม่ 🤝',
            `${user.name} ได้หารค่าใช้จ่าย ${expense.type || 'รายการค่าใช้จ่าย'} (รวม ${n} คน คนละ ~${splitRows[0].amount_r} บาท)`,
            user.f_id,
            '#finance/debt'
          ]
        );

        await client.query('COMMIT');
        return sendResponse(200, { ok: true, message: 'แบ่งค่าใช้จ่ายและบันทึกหนี้เรียบร้อยแล้ว' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // POST /api/finance/expenses/void -> void an expense
    if (method === 'POST' && path === '/finance/expenses/void') {
      const { expenses_id, reason } = parseBody(event);
      if (!expenses_id || !reason) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุรหัสค่าใช้จ่ายและเหตุผลในการยกเลิกนะ' });
      }

      const expRes = await db.query('SELECT * FROM expenses WHERE TRIM(expenses_id) = $1', [expenses_id.trim()]);
      if (expRes.rows.length === 0) {
        return sendResponse(404, { ok: false, error: 'ไม่พบรายการค่าใช้จ่ายนี้' });
      }

      const expense = expRes.rows[0];
      if (expense.f_id.trim() !== user.f_id) {
        return sendResponse(403, { ok: false, error: 'เฉพาะผู้จ่ายเงินเท่านั้นที่สามารถยกเลิกรายการนี้ได้นะ' });
      }

      // Check if any split has already been settled
      const settledRes = await db.query(
        `SELECT COUNT(*) FROM expenses_split 
         WHERE TRIM(expenses_id) = $1 AND settlement_id IS NOT NULL AND is_void IS NOT TRUE`,
        [expenses_id.trim()]
      );
      if (parseInt(settledRes.rows[0].count, 10) > 0) {
        return sendResponse(400, { 
          ok: false, 
          error: 'มีรายการหนี้ที่ชำระไปแล้ว กรุณาจัดการรายการชำระหนี้ (Settlement) ให้เรียบร้อยก่อนยกเลิกค่าใช้จ่ายนะ' 
        });
      }

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Void the expense
        await client.query(
          `UPDATE expenses 
           SET is_void = TRUE, void_reason = $1, void_by = $2, void_at = CURRENT_TIMESTAMP
           WHERE TRIM(expenses_id) = $3`,
          [reason, user.f_id, expenses_id.trim()]
        );

        // Void associated splits
        await client.query(
          `UPDATE expenses_split 
           SET is_void = TRUE, void_reason = $1, void_by = $2, void_at = CURRENT_TIMESTAMP
           WHERE TRIM(expenses_id) = $3`,
          [reason, user.f_id, expenses_id.trim()]
        );

        // Audit Log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, old_values, new_values, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'expense',
            expenses_id.trim(),
            'void',
            user.f_id,
            JSON.stringify(expense),
            JSON.stringify({ is_void: true, void_reason: reason, void_by: user.f_id }),
            reason
          ]
        );

        await client.query('COMMIT');
        return sendResponse(200, { ok: true, message: 'ยกเลิกรายการค่าใช้จ่ายเรียบร้อยแล้ว' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // ==========================================
    // 9. FINANCE: DEBT & SETTLEMENT
    // ==========================================

    // GET /api/finance/debt -> list debts grouped by debtor & creditor + breakdown
    if (method === 'GET' && path === '/finance/debt') {
      const debtsRes = await db.query(
        `SELECT 
            es.expenses_split_id,
            es.f_id AS debtor_id,
            debtor.name AS debtor_name,
            e.f_id AS creditor_id,
            creditor.name AS creditor_name,
            es.amount_r,
            e.expenses_id,
            e.type AS expense_type,
            e.date AS expense_date,
            e.description AS expense_desc
         FROM expenses_split es
         JOIN expenses e ON TRIM(e.expenses_id) = TRIM(es.expenses_id)
         JOIN friends debtor ON TRIM(debtor.f_id) = TRIM(es.f_id)
         JOIN friends creditor ON TRIM(creditor.f_id) = TRIM(e.f_id)
         WHERE es.is_void IS NOT TRUE 
           AND e.is_void IS NOT TRUE 
           AND es.settlement_id IS NULL
           AND TRIM(es.f_id) != TRIM(e.f_id)
         ORDER BY e.date ASC, es.expenses_split_id ASC`
      );

      // Group by debtor/creditor pair
      const groupedMap = new Map();
      debtsRes.rows.forEach(r => {
        const pairKey = `${r.debtor_id.trim()}_to_${r.creditor_id.trim()}`;
        if (!groupedMap.has(pairKey)) {
          groupedMap.set(pairKey, {
            pairKey,
            debtor_id: r.debtor_id.trim(),
            debtor_name: r.debtor_name,
            creditor_id: r.creditor_id.trim(),
            creditor_name: r.creditor_name,
            total_debt: 0,
            splits: []
          });
        }
        const g = groupedMap.get(pairKey);
        const amt = parseFloat(r.amount_r);
        g.total_debt += amt;
        g.splits.push({
          split_id: r.expenses_split_id.trim(),
          amount: amt,
          expenses_id: r.expenses_id.trim(),
          expense_type: r.expense_type,
          expense_date: r.expense_date,
          expense_desc: r.expense_desc
        });
      });

      return sendResponse(200, {
        ok: true,
        debtPairs: Array.from(groupedMap.values())
      });
    }

    // POST /api/finance/settlement -> pay all debts between pair atomically with slip
    if (method === 'POST' && path === '/finance/settlement') {
      const { debtor_id, creditor_id, date, description, slip_file, original_filename, mime_type } = parseBody(event);

      if (!debtor_id || !creditor_id) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุคู่ผู้ชำระและผู้รับเงิน' });
      }

      // Check slip
      if (!slip_file) {
        return sendResponse(400, { ok: false, error: 'การชำระหนี้ต้องแนบสลิปโอนเงินด้วยนะ' });
      }

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Fetch all unpaid splits between this exact debtor and creditor
        const splitsRes = await client.query(
          `SELECT es.expenses_split_id, es.amount_r
           FROM expenses_split es
           JOIN expenses e ON TRIM(e.expenses_id) = TRIM(es.expenses_id)
           WHERE TRIM(es.f_id) = $1 
             AND TRIM(e.f_id) = $2 
             AND es.settlement_id IS NULL 
             AND es.is_void IS NOT TRUE 
             AND e.is_void IS NOT TRUE`,
          [debtor_id.trim(), creditor_id.trim()]
        );

        if (splitsRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return sendResponse(400, { ok: false, error: 'ไม่มียอดหนี้ค้างชำระระหว่างคู่นี้แล้ว' });
        }

        const totalDebt = splitsRes.rows.reduce((sum, r) => sum + parseFloat(r.amount_r), 0);

        // Upload slip
        const fileBuffer = Buffer.from(slip_file, 'base64');
        const storagePath = await storage.uploadSlip(fileBuffer, original_filename || 'settlement.jpg', mime_type || 'image/jpeg', 'settlements');

        // Generate settlement_id: ST00000001 (10 chars)
        const countRes = await client.query('SELECT COUNT(*) FROM settlement');
        const nextIdNum = parseInt(countRes.rows[0].count, 10) + 1;
        const settlement_id = `ST${String(nextIdNum).padStart(8, '0')}`.substring(0, 10);

        const txDate = date || new Date().toISOString().split('T')[0];

        // Insert settlement row: column is `tranfer_f` (as spelled in actual DB schema!)
        await client.query(
          `INSERT INTO settlement (settlement_id, tranfer_f, receive_f, amount_s, date, url_s, description, is_void, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, CURRENT_TIMESTAMP)`,
          [settlement_id, debtor_id.trim(), creditor_id.trim(), totalDebt, txDate, storagePath, description || 'ชำระหนี้รวม']
        );

        // Link all splits to this settlement_id
        const splitIds = splitsRes.rows.map(r => r.expenses_split_id.trim());
        await client.query(
          `UPDATE expenses_split 
           SET settlement_id = $1 
           WHERE TRIM(expenses_split_id) = ANY($2::text[])`,
          [settlement_id, splitIds]
        );

        // Audit Log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, new_values, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'settlement',
            settlement_id,
            'create',
            user.f_id,
            JSON.stringify({ settlement_id, debtor_id, creditor_id, amount: totalDebt, split_count: splitIds.length, url: storagePath }),
            'ชำระหนี้พร้อมแนบสลิป'
          ]
        );

        // Notification for creditor
        const debtorNameRes = await client.query('SELECT name FROM friends WHERE TRIM(f_id) = $1', [debtor_id.trim()]);
        const debtorName = debtorNameRes.rows[0] ? debtorNameRes.rows[0].name : debtor_id;

        await client.query(
          `INSERT INTO notifications (event_type, title, message, actor_f_id, target_f_id, action_link)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'settlement_submitted',
            'มีเพื่อนชำระหนี้แล้ว 🎉',
            `${debtorName} ได้ชำระหนี้จำนวน ${totalDebt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ให้คุณแล้ว`,
            user.f_id,
            creditor_id.trim(),
            '#finance/repayments'
          ]
        );

        await client.query('COMMIT');
        return sendResponse(200, { ok: true, settlement_id, message: 'ชำระหนี้เรียบร้อยแล้ว' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // GET /api/finance/repayments -> repayment history
    if (method === 'GET' && path === '/finance/repayments') {
      const res = await db.query(
        `SELECT s.settlement_id, s.tranfer_f, debtor.name AS debtor_name, 
                s.receive_f, creditor.name AS creditor_name, 
                s.amount_s, s.date, s.url_s, s.description, s.is_void, s.void_reason, s.created_at
         FROM settlement s
         JOIN friends debtor ON TRIM(debtor.f_id) = TRIM(s.tranfer_f)
         JOIN friends creditor ON TRIM(creditor.f_id) = TRIM(s.receive_f)
         ORDER BY s.created_at DESC, s.settlement_id DESC`
      );

      const items = await Promise.all(res.rows.map(async r => {
        let signedUrl = null;
        if (r.url_s && r.url_s.trim()) {
          signedUrl = await storage.getSignedSlipUrl(r.url_s.trim());
        }
        return {
          settlement_id: r.settlement_id.trim(),
          debtor_id: r.tranfer_f.trim(),
          debtor_name: r.debtor_name,
          creditor_id: r.receive_f.trim(),
          creditor_name: r.creditor_name,
          amount_s: parseFloat(r.amount_s),
          date: r.date,
          url_s: r.url_s ? r.url_s.trim() : null,
          signed_url: signedUrl,
          description: r.description,
          is_void: Boolean(r.is_void),
          void_reason: r.void_reason,
          created_at: r.created_at
        };
      }));

      return sendResponse(200, { ok: true, items });
    }

    // POST /api/finance/settlement/void -> void settlement & restore linked splits to unpaid
    if (method === 'POST' && path === '/finance/settlement/void') {
      const { settlement_id, reason } = parseBody(event);
      if (!settlement_id || !reason) {
        return sendResponse(400, { ok: false, error: 'กรุณาระบุรหัสการชำระหนี้และเหตุผลในการยกเลิกนะ' });
      }

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        const sRes = await client.query('SELECT * FROM settlement WHERE TRIM(settlement_id) = $1', [settlement_id.trim()]);
        if (sRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return sendResponse(404, { ok: false, error: 'ไม่พบรายการชำระหนี้นี้' });
        }
        const s = sRes.rows[0];

        // Creator of settlement or debtor can void
        if (s.tranfer_f.trim() !== user.f_id) {
          await client.query('ROLLBACK');
          return sendResponse(403, { ok: false, error: 'เฉพาะผู้สร้างรายการชำระเงินเท่านั้นที่สามารถยกเลิกได้นะ' });
        }

        if (s.is_void) {
          await client.query('ROLLBACK');
          return sendResponse(400, { ok: false, error: 'รายการนี้ถูกยกเลิกไปแล้ว' });
        }

        // 1. Mark settlement void
        await client.query(
          `UPDATE settlement 
           SET is_void = TRUE, void_reason = $1, void_by = $2, void_at = CURRENT_TIMESTAMP
           WHERE TRIM(settlement_id) = $3`,
          [reason, user.f_id, settlement_id.trim()]
        );

        // 2. Restore all linked splits back to unpaid (settlement_id = NULL)
        await client.query(
          `UPDATE expenses_split 
           SET settlement_id = NULL 
           WHERE TRIM(settlement_id) = $1`,
          [settlement_id.trim()]
        );

        // 3. Audit Log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, event_type, actor_f_id, old_values, new_values, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'settlement',
            settlement_id.trim(),
            'void',
            user.f_id,
            JSON.stringify(s),
            JSON.stringify({ is_void: true, void_reason: reason, void_by: user.f_id }),
            reason
          ]
        );

        await client.query('COMMIT');
        return sendResponse(200, { ok: true, message: 'ยกเลิกรายการชำระหนี้และคืนสถานะหนี้เรียบร้อยแล้ว' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // ==========================================
    // 10. AUDIT LOGS
    // ==========================================

    if (method === 'GET' && path === '/audit-logs') {
      const qs = event.queryStringParameters || {};
      const entityType = qs.entity_type || null;
      const actorId = qs.actor_id || null;
      const limit = Math.min(parseInt(qs.limit, 10) || 50, 100);

      let sql = `
        SELECT a.log_id, a.entity_type, a.entity_id, a.event_type, a.actor_f_id, 
               f.name AS actor_name, a.old_values, a.new_values, a.reason, a.created_at
        FROM audit_logs a
        LEFT JOIN friends f ON TRIM(f.f_id) = TRIM(a.actor_f_id)
        WHERE 1=1
      `;
      const params = [];
      let pIdx = 1;

      if (entityType) {
        sql += ` AND a.entity_type = $${pIdx++}`;
        params.push(entityType);
      }
      if (actorId) {
        sql += ` AND TRIM(a.actor_f_id) = $${pIdx++}`;
        params.push(actorId.trim());
      }

      sql += ` ORDER BY a.created_at DESC LIMIT $${pIdx++}`;
      params.push(limit);

      const res = await db.query(sql, params);
      return sendResponse(200, { ok: true, logs: res.rows });
    }

    // Unknown endpoint
    return sendResponse(404, { ok: false, error: 'ไม่พบ Endpoint ที่เรียกใช้' });
  } catch (err) {
    console.error('API Error:', err);
    return sendResponse(500, { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งนะ' });
  }
};
