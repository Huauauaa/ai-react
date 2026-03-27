import { Card, ConfigProvider, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import FiberCrossSection from './components/FiberCrossSection'
import case1Data from './components/case1.json'
import case2Data from './components/case2.json'

function App() {
  const cases = useMemo(
    () => ({
      case1: case1Data,
      case2: case2Data,
    }),
    [],
  )
  const [activeCaseKey, setActiveCaseKey] = useState<keyof typeof cases>('case1')

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
              <Select
                value={activeCaseKey}
                onChange={(value) => setActiveCaseKey(value)}
                options={[
                  { value: 'case1', label: 'case1.json' },
                  { value: 'case2', label: 'case2.json' },
                ]}
                style={{ width: 180 }}
              />
              <FiberCrossSection caseData={cases[activeCaseKey]} />
            </Space>
          </Card>
        </section>
      </main>
    </ConfigProvider>
  )
}

export default App
