import ReactDOM from 'react-dom/client'
import './index.css'

import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import CourseCatalogue from './pages/CourseCatalogue.jsx'
import Courses from './pages/Courses.jsx'
import Assessments from './pages/Assessments.jsx'
import Pathways from './pages/Pathways.jsx'
import Manage from './pages/Manage.jsx'
import Record from './pages/Record.jsx'
import Home from './pages/Home.jsx'
import ExperienceFeedback from './pages/ExperienceFeedback.jsx'
import CourseManagement from './pages/CourseManagement.jsx'
import AssessmentManagement from './pages/AssessmentManagement.jsx'
import AssessmentScoring from './pages/AssessmentScoring.jsx'
import PathwayManagement from './pages/PathwayManagement.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import {
  createBrowserRouter,
  RouterProvider
} from "react-router-dom"

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Home/></ProtectedRoute>
  },
  {
    path: "/Home",
    element: <ProtectedRoute><Home/></ProtectedRoute>
  },
  {
    path: "/CourseCatalogue",
    element: <ProtectedRoute><CourseCatalogue/></ProtectedRoute>
  },
  {
    path: "/Courses",
    element: <ProtectedRoute><Courses/></ProtectedRoute>
  },
  {
    path: "/Assessments",
    element: <ProtectedRoute><Assessments/></ProtectedRoute>
  },
  {
    path: "/Register",
    element:<Register/>
  },
  {
    path: "/Login",
    element:<Login/>
  },
  {
    path: "/Pathways",
    element: <ProtectedRoute><Pathways/></ProtectedRoute>
  },
  {
    path: "/Manage",
    element: <ProtectedRoute><Manage/></ProtectedRoute>
  },
  {
    path: "/Record",
    element: <ProtectedRoute><Record/></ProtectedRoute>
  },
  {
    path: "/ExperienceFeedback",
    element: <ProtectedRoute><ExperienceFeedback/></ProtectedRoute>
  },
  {
    path: "/CourseManagement",
    element: <ProtectedRoute><CourseManagement/></ProtectedRoute>
  },
  {
    path: "/AssessmentManagement",
    element: <ProtectedRoute><AssessmentManagement/></ProtectedRoute>
  },
  {
    path: "/PathwayManagement",
    element: <ProtectedRoute><PathwayManagement/></ProtectedRoute>
  },
  {
    path: "/AssessmentScoring",
    element: <ProtectedRoute><AssessmentScoring/></ProtectedRoute>
  },
  {
    path: "*",
    element: <ProtectedRoute><Home/></ProtectedRoute>
  }
])

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <RouterProvider router={router}></RouterProvider>
)
