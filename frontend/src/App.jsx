import LoginPage from './pages/LoginPage'
import useAuthUser from './hooks/useAuthUser.js';
import {Routes,Route,Navigate} from "react-router";
import HomePage from './pages/HomePage.jsx';
import Layout from './components/Layout.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MapPage from './pages/MapPage.jsx';
import CreateReport from './pages/CreateReport.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ProtocolPage from './pages/ProtocolPage.jsx';
import { Loader2 } from 'lucide-react';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);

  if (isLoading) {
     return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      </div>
    );
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
              <Navigate to = "/login" />
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
              <Navigate to = "/login" />
            )
          }
        />

        <Route 
          path='/protocols'
          element={
            isAuthenticated?(
              <Layout>
                <ProtocolPage/>
              </Layout>    
            ):
            (
              <Navigate to = "/login" />
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