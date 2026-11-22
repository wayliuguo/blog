const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: { primary: true, type: 'int', generated: 'increment' },
        name: { type: 'varchar', length: 50 },
        email: { type: 'varchar', length: 100, unique: true },
        password: { type: 'varchar', length: 255 },
        role: { type: 'varchar', length: 20, default: 'user' },
        createdAt: { type: 'datetime', createDate: true },
        updatedAt: { type: 'datetime', updateDate: true }
    }
})
