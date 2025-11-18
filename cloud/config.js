module.exports = {
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0'
    },
    mqtt: {
        host: 'localhost',
        port: 1883,
        username: '',
        password: ''
    },
    logging: {
        level: 'info',
        filename: 'logs/cloud-server.log'
    }
};
