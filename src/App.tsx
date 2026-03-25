import { Button, Card, ConfigProvider, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 10,
        },
      }}
    >
      <main className="min-h-screen bg-slate-100 p-6 md:p-10">
        <section className="mx-auto max-w-3xl">
          <Card className="shadow-sm" variant="borderless">
            <Space direction="vertical" size="middle" className="w-full">
              <Text className="text-sky-600">Vite + React + TypeScript</Text>
              <Title level={2} style={{ margin: 0 }}>
                Ant Design + Tailwind CSS 初始化完成
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>
                你现在可以在 <code>src/App.tsx</code> 中开始业务开发。页面使用
                <Text strong> Ant Design 组件 </Text>
                与
                <Text strong> Tailwind 原子类 </Text>
                混合搭建。
              </Paragraph>
              <div className="flex flex-wrap gap-3">
                <Button type="primary">Primary Button</Button>
                <Button>Default Button</Button>
              </div>
            </Space>
          </Card>
        </section>
      </main>
    </ConfigProvider>
  )
}

export default App
