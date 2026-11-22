const { DataSource } = require('typeorm')
const config = require('./index')

const AppDataSource = new DataSource({
    type: 'mysql',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.database.synchronize,
    logging: config.nodeEnv === 'development',
    entities: [__dirname + '/../entities/*.js'],
    migrations: [__dirname + '/../migrations/*.{js,ts}'],
    migrationsTableName: '_migrations_history'
})

module.exports = { AppDataSource }
