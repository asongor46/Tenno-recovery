import Home from './pages/Home';
import AgreementTemplates from './pages/AgreementTemplates';
import AutomationLog from './pages/AutomationLog';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import CleanupTools from './pages/CleanupTools';
import Counties from './pages/Counties';
import CountyDetail from './pages/CountyDetail';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import FormLibrary from './pages/FormLibrary';
import HotCases from './pages/HotCases';
import HowTo from './pages/HowTo';
import Invoices from './pages/Invoices';
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
import PortalNotary from './pages/PortalNotary';
import PortalWelcome from './pages/PortalWelcome';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import Communications from './pages/Communications';
import Reminders from './pages/Reminders';
import UserManagement from './pages/UserManagement';
import PortalLostLink from './pages/PortalLostLink';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "AgreementTemplates": AgreementTemplates,
    "AutomationLog": AutomationLog,
    "CaseDetail": CaseDetail,
    "Cases": Cases,
    "CleanupTools": CleanupTools,
    "Counties": Counties,
    "CountyDetail": CountyDetail,
    "Dashboard": Dashboard,
    "FileManager": FileManager,
    "FormLibrary": FormLibrary,
    "HotCases": HotCases,
    "HowTo": HowTo,
    "Invoices": Invoices,
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
    "PortalNotary": PortalNotary,
    "PortalWelcome": PortalWelcome,
    "Profile": Profile,
    "Settings": Settings,
    "Templates": Templates,
    "Communications": Communications,
    "Reminders": Reminders,
    "UserManagement": UserManagement,
    "PortalLostLink": PortalLostLink,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};