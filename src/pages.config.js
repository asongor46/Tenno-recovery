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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};