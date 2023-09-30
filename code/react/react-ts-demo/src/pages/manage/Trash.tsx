import { FC, useState } from 'react'
import { useTitle } from 'ahooks'
import { Empty, Typography, Table, Tag, Space, Button, Modal } from 'antd'
import ListSearch from '../../components/ListSearch'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import styles from '../../style/common.module.scss'

type questionProps = {
    _id: string
    title: string
    isPublished: boolean
    isStar: boolean
    answerCount: number
    createAt: string | number
}
type questionListProps = questionProps[]
const { Title } = Typography
const { confirm } = Modal

const Trash: FC = () => {
    useTitle('问卷网-回收站')
    const [questionList, setQuestionList] = useState<questionListProps>([
        {
            _id: 'q1',
            title: '问卷1',
            isPublished: true,
            isStar: true,
            answerCount: 2,
            createAt: '1月10日'
        },
        {
            _id: 'q2',
            title: '问卷2',
            isPublished: false,
            isStar: true,
            answerCount: 3,
            createAt: '2月10日'
        }
    ])
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
            dataIndex: 'createAt'
        }
    ]

    const [selectedIds, setSelectedIds] = useState<string[]>([])

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
                    <Button disabled={selectedIds.length === 0}>恢复</Button>
                    <Button danger disabled={selectedIds.length === 0} onClick={del}>
                        删除
                    </Button>
                </Space>
            </div>
            <Table
                dataSource={questionList}
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
                {questionList.length === 0 && <Empty description="暂无数据" />}
                {questionList.length > 0 && TableElem}
            </div>
        </>
    )
}

export default Trash
