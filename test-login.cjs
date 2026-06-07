const http = require('https');
const data = JSON.stringify({ email: 'test@test.com', password: 'wrongpassword' });
const options = {
  hostname: 'garden-be.vercel.app',
  port: 443,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});
req.on('error', error => {
  console.error(error);
});
req.write(data);
req.end();
