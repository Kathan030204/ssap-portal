import { Route, Routes } from "react-router-dom"
import { Creator } from "./creator/Creator"
import { Tester } from "./tester/Tester"
import { Designer } from "./designer/Designer"
import { Admin } from "./admin/Admin"
import { Login } from "./login/Login"

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Login />}/>
      <Route path="/creator" element={<Creator/>} />
      <Route path="/tester" element={<Tester />} />
      <Route path="/designer" element={<Designer />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
    </>
  )
}

export default App
