import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { IcBadge, IcCard, IcTypography } from "@ukic/react";
import { mdiCommentQuote, mdiFileDocumentMultiple, mdiGraphOutline, mdiNotebook, mdiCheckCircle, mdiSignDirection, mdiAccountCheck, mdiPuzzle } from "@mdi/js";
import { divContainer, cardContainer } from "../styles/containerLayout";

import Header from "../components/HomeHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { fetchData } from "../commonFunctions/api";
import { countAwaitingFeedback } from "../commonFunctions/commonUtilities";

function Home() {

  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [refereeItems, setRefereeItems] = useState({ experiences: [], courseEnrollments: [], assessments: [] });
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Fetch feedback requests (experiences)
    fetchData("/feedback")
      .then(data => setData(data.feedback))
      .catch(err => console.error(err));

    // Fetch current user info
    fetchData("/Auth/user")
      .then((userData) => {
        setUserInfo(userData);
        // Fetch referee items for this user
        return fetchData(`/feedback/referee-items/${userData.employeeID}`);
      })
      .then((refereeData) => setRefereeItems(refereeData))
      .catch(err => console.error(err));
  }, []);

  let awaitingFeedback = countAwaitingFeedback(data);
  
  // Calculate individual awaiting counts
  const awaitingCourses = refereeItems.courseEnrollments?.filter(item => {
    // Simple check for non-completed courses
    return item.currentStatus !== 'Passed' && item.currentStatus !== 'Completed';
  }).length || 0;
  
  const awaitingAssessments = refereeItems.assessments?.filter(item => {
    return item.currentStatus !== 'Passed';
  }).length || 0;

  const handleCardClick = (path) => {
    navigate(path);
  };

  const homeCards = [
    {
      title: "Your Record",
      description: "View your personal training record with courses, assessments, and experiences",
      path: "/Record",
      icon: mdiFileDocumentMultiple
    },
    {
      title: "Pathways", 
      description: "Explore structured learning pathways and track your progress",
      path: "/Pathways",
      icon: mdiSignDirection
    },
    {
      title: "Individual Courses",
      description: "Browse and enroll in individual courses from the catalogue", 
      path: "/Courses",
      icon: mdiNotebook
    },
    {
      title: "Individual Assessments",
      description: "View and complete assessments to validate your knowledge",
      path: "/Assessments", 
      icon: mdiCheckCircle
    },
    {
      title: "Course Management",
      description: "Manage course content, enrollments and review student progress",
      path: "/CourseManagement",
      icon: mdiAccountCheck,
      badge: awaitingCourses
    },
    {
      title: "Assessment Management", 
      description: "Create and score assessments, review student submissions",
      path: "/AssessmentManagement",
      icon: mdiPuzzle,
      badge: awaitingAssessments
    },
    {
      title: "Pathway Management",
      description: "Design learning pathways and manage student progress through structured programs", 
      path: "/PathwayManagement",
      icon: mdiGraphOutline
    },
    {
      title: "Feedback Management",
      description: "Provide feedback on experiences and manage referee requests",
      path: "/ExperienceFeedback",
      icon: mdiCommentQuote,
      badge: awaitingFeedback
    }
  ];

  return (
    <>
      <Header />

      {homeCards.map((card, index) => (
        <div key={index} style={divContainer}>
          <div>
            <IcCard 
              style={cardContainer} 
              heading={card.title} 
              subheading={card.description}
              clickable="true"
              onClick={() => handleCardClick(card.path)}
            >
              <SlottedSVGTemplate mdiIcon={card.icon} />
              {card.badge && card.badge > 0 && (
                <IcBadge 
                  size="large" 
                  textLabel={card.badge} 
                  slot="badge" 
                  variant="info" 
                />
              )}
            </IcCard>
          </div>
          <div></div>
        </div>
      ))}

      <Footer />
    </>
  )
};

export default Home;