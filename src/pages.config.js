import AgentApply from './pages/AgentApply';
import AgentOnboarding from './pages/AgentOnboarding';
import AgentPending from './pages/AgentPending';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Counties from './pages/Counties';
import CountyDetail from './pages/CountyDetail';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import FormLibrary from './pages/FormLibrary';
import HowItWorks from './pages/HowItWorks';
import HowTo from './pages/HowTo';
import LandingPage from './pages/LandingPage';
import PacketBuilder from './pages/PacketBuilder';
import PortalAgreement from './pages/PortalAgreement';
import PortalComplete from './pages/PortalComplete';
import PortalDashboard from './pages/PortalDashboard';
import PortalInfo from './pages/PortalInfo';
import PortalLogin from './pages/PortalLogin';
import PortalLostLink from './pages/PortalLostLink';
import PortalNotary from './pages/PortalNotary';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgentApply": AgentApply,
    "AgentOnboarding": AgentOnboarding,
    "AgentPending": AgentPending,
    "CaseDetail": CaseDetail,
    "Cases": Cases,
    "Counties": Counties,
    "CountyDetail": CountyDetail,
    "Dashboard": Dashboard,
    "FileManager": FileManager,
    "FormLibrary": FormLibrary,
    "HowItWorks": HowItWorks,
    "HowTo": HowTo,
    "LandingPage": LandingPage,
    "PacketBuilder": PacketBuilder,
    "PortalAgreement": PortalAgreement,
    "PortalComplete": PortalComplete,
    "PortalDashboard": PortalDashboard,
    "PortalInfo": PortalInfo,
    "PortalLogin": PortalLogin,
    "PortalLostLink": PortalLostLink,
    "PortalNotary": PortalNotary,
    "Profile": Profile,
    "Settings": Settings,
    "Templates": Templates,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};