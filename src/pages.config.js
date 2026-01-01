import AgreementTemplates from './pages/AgreementTemplates';
import AutomationLog from './pages/AutomationLog';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import CleanupTools from './pages/CleanupTools';
import Communications from './pages/Communications';
import Counties from './pages/Counties';
import CountyDetail from './pages/CountyDetail';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import FormLibrary from './pages/FormLibrary';
import HotCases from './pages/HotCases';
import HowItWorks from './pages/HowItWorks';
import HowTo from './pages/HowTo';
import Invoices from './pages/Invoices';
import LandingPage from './pages/LandingPage';
import NotaryValidator from './pages/NotaryValidator';
import OCRExtractor from './pages/OCRExtractor';
import PacketBuilder from './pages/PacketBuilder';
import PeopleFinder from './pages/PeopleFinder';
import PortalAgreement from './pages/PortalAgreement';
import PortalComplete from './pages/PortalComplete';
import PortalDashboard from './pages/PortalDashboard';
import PortalIDUpload from './pages/PortalIDUpload';
import PortalInfo from './pages/PortalInfo';
import PortalIntake from './pages/PortalIntake';
import PortalLogin from './pages/PortalLogin';
import PortalLostLink from './pages/PortalLostLink';
import PortalNotary from './pages/PortalNotary';
import PortalRegister from './pages/PortalRegister';
import PortalWelcome from './pages/PortalWelcome';
import Profile from './pages/Profile';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import UserManagement from './pages/UserManagement';
import AgentApply from './pages/AgentApply';
import AgentPending from './pages/AgentPending';
import AgentOnboarding from './pages/AgentOnboarding';
import PaymentPipeline from './pages/PaymentPipeline';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgreementTemplates": AgreementTemplates,
    "AutomationLog": AutomationLog,
    "CaseDetail": CaseDetail,
    "Cases": Cases,
    "CleanupTools": CleanupTools,
    "Communications": Communications,
    "Counties": Counties,
    "CountyDetail": CountyDetail,
    "Dashboard": Dashboard,
    "FileManager": FileManager,
    "FormLibrary": FormLibrary,
    "HotCases": HotCases,
    "HowItWorks": HowItWorks,
    "HowTo": HowTo,
    "Invoices": Invoices,
    "LandingPage": LandingPage,
    "NotaryValidator": NotaryValidator,
    "OCRExtractor": OCRExtractor,
    "PacketBuilder": PacketBuilder,
    "PeopleFinder": PeopleFinder,
    "PortalAgreement": PortalAgreement,
    "PortalComplete": PortalComplete,
    "PortalDashboard": PortalDashboard,
    "PortalIDUpload": PortalIDUpload,
    "PortalInfo": PortalInfo,
    "PortalIntake": PortalIntake,
    "PortalLogin": PortalLogin,
    "PortalLostLink": PortalLostLink,
    "PortalNotary": PortalNotary,
    "PortalRegister": PortalRegister,
    "PortalWelcome": PortalWelcome,
    "Profile": Profile,
    "Reminders": Reminders,
    "Settings": Settings,
    "Templates": Templates,
    "UserManagement": UserManagement,
    "AgentApply": AgentApply,
    "AgentPending": AgentPending,
    "AgentOnboarding": AgentOnboarding,
    "PaymentPipeline": PaymentPipeline,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};