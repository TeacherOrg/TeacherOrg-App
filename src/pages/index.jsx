import Layout from "./Layout.jsx";
import Timetable from "./Timetable";
import Grades from "./Grades";
import Groups from "./Groups";
import YearlyOverview from "./YearlyOverview";
import Chores from "./Chores";
import TopicsView from "./TopicsView"; // Neue Komponente importieren
import { Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Timetable: Timetable,
    Grades: Grades,
    Groups: Groups,
    YearlyOverview: YearlyOverview,
    Chores: Chores,
    Topics: TopicsView, // Neue Seite hinzufügen
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

export default function Pages() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Timetable />} />
                <Route path="/Timetable" element={<Timetable />} /> {/* Entspricht "Stundenplan" */}
                <Route path="/Grades" element={<Grades />} /> {/* Entspricht "Leistung" */}
                <Route path="/Groups" element={<Groups />} /> {/* Entspricht "Gruppen" */}
                <Route path="/YearlyOverview" element={<YearlyOverview />} />
                <Route path="/Chores" element={<Chores />} /> {/* Entspricht "Ämtliplan" */}
                <Route path="/Topics" element={<TopicsView />} /> {/* Neue Route für "Themenansicht" */}
            </Routes>
        </Layout>
    );
}