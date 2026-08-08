const mongoose = require('mongoose');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true')
    .then(async () => {
        const User = mongoose.connection.collection('users');
        const users = await User.find({ profileImage: /superadmin/i }).toArray();
        console.log('Users with superadmin URL:', users.length);
        if (users.length > 0) {
            console.log(users.map(u => ({ id: u._id, name: u.name, profileImage: u.profileImage })));
        }
        
        process.exit(0);
    });
