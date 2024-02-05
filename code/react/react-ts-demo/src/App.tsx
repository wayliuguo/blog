import { RouterProvider } from 'react-router-dom'
import routerConfig from './router'
import './App.css'
import 'antd/dist/reset.css'
// import ContextDemo from './contextDemo'

function App() {
    return <RouterProvider router={routerConfig}></RouterProvider>
    // return <ContextDemo />
}

export default App
