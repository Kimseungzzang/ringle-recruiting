import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import MainPage from "./pages/MainPage";
import MyPage from "./pages/MyPage";
import MembershipPurchasePage from "./pages/MembershipPurchasePage";
import StudyPage from "./pages/StudyPage";
import StudyIntroPage from "./pages/StudyIntroPage";
import StudyDetailPage from "./pages/StudyDetailPage";
import AdminMembersPage from "./pages/AdminMembersPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<MainPage />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="membership/purchase" element={<MembershipPurchasePage />} />
            <Route path="study" element={<StudyPage />} />
            <Route path="study/:topicId" element={<StudyIntroPage />} />
            <Route path="study/:topicId/conversation" element={<StudyDetailPage />} />
            <Route path="admin/members" element={<AdminMembersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
