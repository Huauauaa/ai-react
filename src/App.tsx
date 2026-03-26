import { Card, ConfigProvider, Space, Typography } from 'antd'
import FiberCrossSection from './components/FiberCrossSection'

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
                光纤横切面（Fabric.js）
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>
                支持输入任意芯数并自动匹配模板：小于等于 144 使用 144 芯模板，大于 144 且小于等于 288 使用 288 芯模板，大于 288 不处理。点击管束或纤芯后，会弹出弹框，显示对应的编号信息。
              </Paragraph>
              <FiberCrossSection />
            </Space>
          </Card>
        </section>
      </main>
    </ConfigProvider>
  )
}

export default App
