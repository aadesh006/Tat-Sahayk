import LoginPage from './pages/LoginPage'
import useAuthUser from './hooks/useAuthUser.js';
import {Routes,Route,Navigate} from "react-router";
import HomePage from './pages/HomePage.jsx';
const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);
  return (
    <div className="h-screen">
      <Routes>
        <Route 
          path='/'
          element={
            isAuthenticated?(
              <HomePage/>
            ):
            (
              <Navigate to = "login" />
            )
          }
        />
        <Route
           path='/login'
           element={
            !isAuthenticated?(
              <LoginPage />
            ):
            (
              <Navigate to ="/"/>
            )
           }
        />
      </Routes>
    </div>
  )
}

export default App