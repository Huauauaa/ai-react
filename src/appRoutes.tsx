import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { App } from './App'
import { boneyardRoute } from './routes/Boneyard.router'
import { draggableModalRoute } from './routes/DraggableModal.router'
import { fiberCrossSectionRoute } from './routes/FiberCrossSection.router'
import { konvaTiledPhotoGridRoute } from './routes/KonvaTiledPhotoGrid.router'
import { fileExplorerRoute } from './routes/FileExplorer.router'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="fiber" replace /> },
      fiberCrossSectionRoute,
      konvaTiledPhotoGridRoute,
      draggableModalRoute,
      boneyardRoute,
      fileExplorerRoute,
    ],
  },
]
