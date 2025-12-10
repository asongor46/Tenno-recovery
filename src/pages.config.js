import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import HotCases from './pages/HotCases';
import CaseDetail from './pages/CaseDetail';
import Counties from './pages/Counties';
import CountyDetail from './pages/CountyDetail';
import Templates from './pages/Templates';
import HowTo from './pages/HowTo';
import PortalWelcome from './pages/PortalWelcome';
import PortalAgreement from './pages/PortalAgreement';
import PortalInfo from './pages/PortalInfo';
import PortalNotary from './pages/PortalNotary';
import PortalComplete from './pages/PortalComplete';
import PacketBuilder from './pages/PacketBuilder';
import OCRExtractor from './pages/OCRExtractor';
import NotaryValidator from './pages/NotaryValidator';
import FileManager from './pages/FileManager';
import AutomationLog from './pages/AutomationLog';
import CleanupTools from './pages/CleanupTools';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import PeopleFinder from './pages/PeopleFinder';
import PortalDashboard from './pages/PortalDashboard';
import PortalIDUpload from './pages/PortalIDUpload';
import PortalIntake from './pages/PortalIntake';
import Invoices from './pages/Invoices';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cases": Cases,
    "HotCases": HotCases,
    "CaseDetail": CaseDetail,
    "Counties": Counties,
    "CountyDetail": CountyDetail,
    "Templates": Templates,
    "HowTo": HowTo,
    "PortalWelcome": PortalWelcome,
    "PortalAgreement": PortalAgreement,
    "PortalInfo": PortalInfo,
    "PortalNotary": PortalNotary,
    "PortalComplete": PortalComplete,
    "PacketBuilder": PacketBuilder,
    "OCRExtractor": OCRExtractor,
    "NotaryValidator": NotaryValidator,
    "FileManager": FileManager,
    "AutomationLog": AutomationLog,
    "CleanupTools": CleanupTools,
    "Settings": Settings,
    "Profile": Profile,
    "PeopleFinder": PeopleFinder,
    "PortalDashboard": PortalDashboard,
    "PortalIDUpload": PortalIDUpload,
    "PortalIntake": PortalIntake,
    "Invoices": Invoices,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};