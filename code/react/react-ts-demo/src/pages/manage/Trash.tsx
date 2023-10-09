import { FC, useState } from 'react'
import { useRequest, useTitle } from 'ahooks'
import { Empty, Typography, Table, Tag, Space, Button, Modal, Spin, message } from 'antd'
import ListSearch from '../../components/ListSearch'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import styles from '../../style/common.module.scss'
import useLoadQuestionListData from '../../hooks/useLoadQuestionListData'
import { updateQuestionService } from '../../services/question'

const { Title } = Typography
const { confirm } = Modal

const Trash: FC = () => {
    useTitle('问卷网-回收站')

    const { data = {}, loading, refresh } = useLoadQuestionListData({ isDeleted: true })
    const { list = [] } = data

    const tableColumns = [
        {
            title: '标题',
            dataIndex: 'title'
        },
        {
            title: '是否发布',
            dataIndex: 'isPublished',
            render: (isPublished: boolean) => {
                return isPublished ? <Tag color="processing">已发布</Tag> : <Tag>未发布</Tag>
            }
        },
        {
            title: '答卷',
            dataIndex: 'answerCount'
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt'
        }
    ]

    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // 恢复
    const { run: recover } = useRequest(
        async () => {
            for await (const id of selectedIds) {
                await updateQuestionService(id, { isDeleted: false })
            }
        },
        {
            manual: true,
            debounceWait: 500, // 防抖
            onSuccess() {
                message.success('恢复成功!')
                refresh() // 手动刷新列表
            }
        }
    )

    const del = () => {
        confirm({
            title: '确认彻底 删除该问卷？',
            icon: <ExclamationCircleOutlined />,
            content: '删除以后不可以找回',
            onOk: () => alert(`删除${JSON.stringify(selectedIds)}`)
        })
    }

    const TableElem = (
        <>
            <div style={{ marginBottom: '16px' }}>
                <Space>
                    <Button disabled={selectedIds.length === 0} onClick={recover}>
                        恢复
                    </Button>
                    <Button danger disabled={selectedIds.length === 0} onClick={del}>
                        删除
                    </Button>
                </Space>
            </div>
            <Table
                dataSource={list}
                columns={tableColumns}
                pagination={false}
                rowKey={q => q._id}
                rowSelection={{
                    type: 'checkbox',
                    onChange: selectedRowKeys => {
                        setSelectedIds(selectedRowKeys as string[])
                    }
                }}
            />
        </>
    )

    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <Title level={3}>回收站</Title>
                </div>
                <div className={styles.right}>
                    <ListSearch />
                </div>
            </div>
            <div className={styles.content}>
                {loading && (
                    <div style={{ textAlign: 'center' }}>
                        <Spin />
                    </div>
                )}
                {!loading && list.length === 0 && <Empty description="暂无数据" />}
                {list.length > 0 && TableElem}
            </div>
        </>
    )
}

export default Trash
