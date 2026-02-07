import LoginPage from './pages/LoginPage'
import useAuthUser from './hooks/useAuthUser.js';
import {Routes,Route,Navigate} from "react-router";
import HomePage from './pages/HomePage.jsx';
import Layout from './components/Layout.jsx';
import ReportPage from './pages/ReportPage.jsx';
import MapPage from './pages/MapPage.jsx';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  // const isAuthenticated = Boolean(authUser);
  const isAuthenticated = true;
  return (
    <div className="h-screen">
      <Routes>
        <Route 
          path='/'
          element={
            isAuthenticated?(
              <Layout>
                <HomePage/>
              </Layout>    
            ):
            (
              <Navigate to = "login" />
            )
          }
        />
        <Route 
          path='/map'
          element={
            isAuthenticated?(
              <Layout>
                <MapPage/>
              </Layout>    
            ):
            (
              <Navigate to = "login" />
            )
          }
        />
        <Route 
          path='/Reports'
          element={
            isAuthenticated?(
              <Layout>
                <ReportPage/>
              </Layout>    
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