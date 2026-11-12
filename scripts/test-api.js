require('dotenv').config();
const { handler } = require('../netlify/functions/api');

async function testApi() {
  console.log('Testing Netlify Function API endpoints...');

  // 1. GET /api/auth/friends
  let res = await handler({
    httpMethod: 'GET',
    path: '/api/auth/friends',
    headers: {}
  });
  console.log('1. /api/auth/friends status:', res.statusCode);
  const friendsData = JSON.parse(res.body);
  console.log('   Friends count:', friendsData.friends?.length);

  // 2. POST /api/auth/login
  res = await handler({
    httpMethod: 'POST',
    path: '/api/auth/login',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      f_id: 'F01',
      password: process.env.SHARED_PASSWORD
    })
  });
  console.log('2. /api/auth/login status:', res.statusCode);
  const loginData = JSON.parse(res.body);
  console.log('   Login user:', loginData.user);
  const setCookie = res.headers['Set-Cookie'];
  console.log('   Set-Cookie received:', Boolean(setCookie));

  // Extract session cookie value
  const cookieVal = setCookie ? setCookie.split(';')[0] : '';

  // 3. GET /api/auth/me
  res = await handler({
    httpMethod: 'GET',
    path: '/api/auth/me',
    headers: {
      cookie: cookieVal
    }
  });
  console.log('3. /api/auth/me status:', res.statusCode);
  console.log('   Auth me body:', JSON.parse(res.body));

  // 4. GET /api/trip
  res = await handler({
    httpMethod: 'GET',
    path: '/api/trip',
    headers: { cookie: cookieVal }
  });
  console.log('4. /api/trip:', JSON.parse(res.body));

  // 5. GET /api/itinerary
  res = await handler({
    httpMethod: 'GET',
    path: '/api/itinerary',
    headers: { cookie: cookieVal }
  });
  const itin = JSON.parse(res.body);
  console.log('5. /api/itinerary days:', itin.days?.length);

  // 6. GET /api/places
  res = await handler({
    httpMethod: 'GET',
    path: '/api/places',
    headers: { cookie: cookieVal }
  });
  const places = JSON.parse(res.body);
  console.log('6. /api/places count:', places.places?.length);

  // 7. GET /api/finance/overview
  res = await handler({
    httpMethod: 'GET',
    path: '/api/finance/overview',
    headers: { cookie: cookieVal }
  });
  console.log('7. /api/finance/overview:', JSON.parse(res.body));

  console.log('\nAll API route tests finished successfully!');
}

testApi().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
