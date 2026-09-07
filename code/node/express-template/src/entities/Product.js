const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
    name: 'Product',
    tableName: 'products',
    columns: {
        id: { primary: true, type: 'int', generated: 'increment' },
        name: { type: 'varchar', length: 100 },
        price: { type: 'decimal', precision: 10, scale: 2 },
        stock: { type: 'int', default: 0 },
        createdAt: { type: 'datetime', createDate: true }
    }
})
