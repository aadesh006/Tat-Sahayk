import LoginPage from './pages/LoginPage'
import useAuthUser from './hooks/useAuthUser.js';
import {Routes,Route,Navigate} from "react-router";
import HomePage from './pages/HomePage.jsx';
import Layout from './components/Layout.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MapPage from './pages/MapPage.jsx';
import CreateReport from './pages/CreateReport.jsx';
import SignupPage from './pages/SignupPage.jsx';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);
  // const isAuthenticated = true;

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center font-bold text-blue-600">Verifying Connection...</div>;
  }

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
              <Navigate to = "/login" />
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
          path='/profile'
          element={
            isAuthenticated?(
              <Layout>
                <ProfilePage/>
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
        <Route
           path='/signup'
           element={
            !isAuthenticated?(
              <SignupPage />
            ):
            (
              <Navigate to ="/"/>
            )
           }
        />
        <Route
           path='/New'
           element={
            isAuthenticated?(
              <Layout>
                <CreateReport/>
              </Layout>
              
            ):
            (
              <Navigate to ="/login"/>
            )
           }
        />
      </Routes>
    </div>
  )
}

export default App