const https = require('https');

https.get('https://res.cloudinary.com/lnb79xto/image/upload/v1785833923/taxi-fleet-crm/documents/document-1785833917394-819513224.pdf', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk.toString('utf8'));
    res.on('end', () => console.log('Response code:', res.statusCode, '\nData:', data.substring(0, 200)));
});
