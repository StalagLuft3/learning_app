import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { IcBadge, IcCardVertical } from "@ukic/react";
import { mdiPuzzleOutline, mdiFileAccount, mdiNavigationVariant, mdiNavigationVariantOutline, mdiBook, mdiCheckDecagram, mdiBookOutline, mdiCheckDecagramOutline } from "@mdi/js";
import { cardContainer } from "../styles/containerLayout";

import Header from "../components/HomeHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { fetchData } from "../commonFunctions/api";

function Home() {

  const navigate = useNavigate();
  const [refereeItems, setRefereeItems] = useState({ experiences: [], courseEnrollments: [], assessments: [] });
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Fetch current user info
    fetchData("/Auth/user")
      .then((userData) => {
        setUserInfo(userData);
        if (!userData?.employeeID) {
          return Promise.resolve({ experiences: [], courseEnrollments: [], assessments: [] });
        }

        // Fetch referee items for this user
        return fetchData(`/feedback/referee-items/${userData.employeeID}`);
      })
      .then((refereeData) => {
        setRefereeItems(refereeData);
      })
      .catch(err => console.error(err));
  }, []);

  const awaitingFeedback = refereeItems.experiences?.length || 0;

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
      icon: mdiFileAccount
    },
    {
      title: "Pathways", 
      description: "Explore structured learning pathways and track your progress",
      path: "/Pathways",
      icon: mdiNavigationVariant
    },
    {
      title: "Individual Courses",
      description: "Browse and enroll in individual courses from the catalogue", 
      path: "/Courses",
      icon: mdiBook
    },
    {
      title: "Individual Assessments",
      description: "View and complete assessments to validate your knowledge",
      path: "/Assessments", 
      icon: mdiCheckDecagram
    },
    {
      title: "Course Management",
      description: "Manage course content, enrollments and review student progress",
      path: "/CourseManagement",
      icon: mdiBookOutline,
      badge: awaitingCourses
    },
    {
      title: "Assessment Management", 
      description: "Create and score assessments, review student submissions",
      path: "/AssessmentManagement",
      icon: mdiCheckDecagramOutline,
      badge: awaitingAssessments
    },
    {
      title: "Pathway Management",
      description: "Design learning pathways and manage student progress through structured programs", 
      path: "/PathwayManagement",
      icon: mdiNavigationVariantOutline
    },
    {
      title: "Feedback Management",
      description: "Provide feedback on experiences and manage referee requests",
      path: "/ExperienceFeedback",
      icon: mdiPuzzleOutline,
      badge: awaitingFeedback
    }
  ];

  const cardsByPath = homeCards.reduce((acc, card) => {
    acc[card.path] = card;
    return acc;
  }, {});

  const renderHomeCard = (card) => (
    <IcCardVertical
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
          type="text"
          label={card.badge.toString()}
          slot="badge"
          variant="info"
        />
      )}
    </IcCardVertical>
  );

  return (
    <>
      <Header />

      <div className="home-card-grid-wrapper">
        <div className="home-card-grid">
          <div className="home-card-full-width">
            {renderHomeCard(cardsByPath["/Record"])}
          </div>

          <div>{renderHomeCard(cardsByPath["/Pathways"])}</div>
          <div>{renderHomeCard(cardsByPath["/PathwayManagement"])}</div>

          <div>{renderHomeCard(cardsByPath["/Courses"])}</div>
          <div>{renderHomeCard(cardsByPath["/CourseManagement"])}</div>

          <div>{renderHomeCard(cardsByPath["/Assessments"])}</div>
          <div>{renderHomeCard(cardsByPath["/AssessmentManagement"])}</div>

          <div className="home-card-empty" aria-hidden="true"></div>
          <div>{renderHomeCard(cardsByPath["/ExperienceFeedback"])}</div>
        </div>
      </div>

      <Footer />
    </>
  )
};

export default Home;
