import { Card, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import type { RouteObject } from 'react-router-dom'
import FiberCrossSectionBase from '../components/FiberCrossSection'
import case1Data from '../components/case1.json'
import case2Data from '../components/case2.json'

export function FiberCrossSection() {
  const cases = useMemo(
    () => ({
      case1: case1Data,
      case2: case2Data,
    }),
    [],
  )
  const [activeCaseKey, setActiveCaseKey] = useState<keyof typeof cases>('case1')

  return (
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
        <FiberCrossSectionBase caseData={cases[activeCaseKey]} />
      </Space>
    </Card>
  )
}

export const fiberCrossSectionRoute: RouteObject = {
  path: 'fiber',
  element: <FiberCrossSection />,
}
