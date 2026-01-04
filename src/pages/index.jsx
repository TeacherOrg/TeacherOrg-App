import Layout from "./Layout.jsx";
import Timetable from "./Timetable";
import Grades from "./Grades";
import Groups from "./Groups";
import YearlyOverview from "./YearlyOverview";
import Chores from "./Chores";
import TopicsView from "./TopicsView"; // Neue Komponente importieren
import { Route, Routes, useLocation } from 'react-router-dom';
import StudentsOverview from '@/pages/StudentsOverview';
import StudentDashboardPage from './StudentDashboardPage';
import Landing from "./Landing";

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

    // Landing hat eigenes Layout (ohne Sidebar)
    if (location.pathname === '/landing') {
        return (
            <Routes>
                <Route path="/landing" element={<Landing />} />
            </Routes>
        );
    }

    // Alle anderen Seiten mit Sidebar-Layout
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
                <Route path="/studentsoverview" element={<StudentsOverview />} /> {/* Neue Route für "Studentsoverview" */}
                <Route path="/students" element={<StudentsOverview />} /> {/* Neue Route für "Students" */}
                <Route path="/student-dashboard" element={<StudentDashboardPage />} /> {/* Student Dashboard */}
            </Routes>
        </Layout>
    );
}