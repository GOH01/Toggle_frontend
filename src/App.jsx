import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Home';
import List from './pages/List';
import StoreDetail from './pages/StoreDetail';
import PublicDetail from './pages/PublicDetail';
import Favorites from './pages/Favorites';
import MyMap from './pages/MyMap';
import SharedMap from './pages/SharedMap';
import Signup from './pages/Signup'; // 회원가입 페이지 추가
import Pos from './pages/Pos';
import PosWeb from './pages/PosWeb'; // 신규 데스크탑 전용 메뉴
import HomeWeb from './pages/HomeWeb'; // 신규 데스크탑 전용 맵
import StoreWeb from './pages/StoreWeb'; // 신규 데스크탑 전용 장소 상세
import LandingWeb from './pages/LandingWeb'; // 신규 데스크탑 랜딩
import LoginWeb from './pages/LoginWeb'; // 신규 데스크탑 로그인
import FavoritesWeb from './pages/FavoritesWeb'; // 신규 데스크탑 즐겨찾기
import MyMapWeb from './pages/MyMapWeb'; // 신규 데스크탑 마이페이지
import ListWeb from './pages/ListWeb'; // 신규 데스크탑 통합 리스트
import PublicWeb from './pages/PublicWeb'; // 신규 데스크탑 공공기관 상세
import SignupWeb from './pages/SignupWeb'; // 신규 데스크탑 회원가입
import AdminLoginWeb from './pages/AdminLoginWeb'; // 신규 데스크탑 관리자 로그인
import AdminWeb from './pages/AdminWeb'; // 신규 데스크탑 관리자 페이지
import { restoreAuthSession } from './lib/session';
import { useAuthSession } from './hooks/useAuthSession';

// 모바일 앱 형태를 유지할 페이지들을 감싸는 레이아웃 프레임
function MobileFrame({ children }) {
  return (
    <div className="mobile-frame">
      {children}
    </div>
  );
}

function ProtectedRoute({ children, redirectTo, roles }) {
  const auth = useAuthSession();

  if (!auth.isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles?.length && !roles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        await restoreAuthSession();
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isBootstrapping) {
    return <div style={{ minHeight: '100vh', background: '#0f172a' }} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/web" replace />} />
        {/* 데스크탑 웹 전용 풀스크린 레이아웃 라우트 */}
        <Route path="/web" element={<LandingWeb />} />
        <Route path="/loginweb" element={<LoginWeb />} />
        <Route path="/mapweb" element={<HomeWeb />} />
        <Route path="/storeweb/:id" element={<StoreWeb />} />
        <Route path="/publicweb/:id" element={<PublicWeb />} />
        <Route path="/favoritesweb" element={<ProtectedRoute redirectTo="/loginweb"><FavoritesWeb /></ProtectedRoute>} />
        <Route path="/my-mapweb" element={<ProtectedRoute redirectTo="/loginweb"><MyMapWeb /></ProtectedRoute>} />
        <Route path="/sharedweb" element={<SharedMap />} />
        <Route path="/sharedweb/:publicMapUuid" element={<SharedMap />} />
        <Route path="/listweb" element={<ListWeb />} />
        <Route path="/signupweb" element={<SignupWeb />} />
        <Route path="/posweb" element={<ProtectedRoute redirectTo="/loginweb" roles={['OWNER']}><PosWeb /></ProtectedRoute>} />
        <Route path="/adminloginweb" element={<AdminLoginWeb />} />
        <Route path="/adminweb" element={<ProtectedRoute redirectTo="/adminloginweb" roles={['ADMIN']}><AdminWeb /></ProtectedRoute>} />
        
        {/* 나머지는 모바일 프레임(최대 너비 480px 제한) 적용 */}
        <Route path="*" element={
          <MobileFrame>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/mobile" element={<Landing />} />
              <Route path="/map" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/list" element={<List />} />
              <Route path="/store/:id" element={<StoreDetail />} />
              <Route path="/public/:id" element={<PublicDetail />} />
              <Route path="/favorites" element={<ProtectedRoute redirectTo="/login"><Favorites /></ProtectedRoute>} />
              <Route path="/my-map" element={<ProtectedRoute redirectTo="/login"><MyMap /></ProtectedRoute>} />
              <Route path="/shared" element={<SharedMap />} />
              <Route path="/shared/:publicMapUuid" element={<SharedMap />} />
              <Route path="/pos" element={<ProtectedRoute redirectTo="/login" roles={['OWNER']}><Pos /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute redirectTo="/adminloginweb" roles={['ADMIN']}><Navigate to="/adminweb" replace /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/mobile" replace />} />
            </Routes>
          </MobileFrame>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
