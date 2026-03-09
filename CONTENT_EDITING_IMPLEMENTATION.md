# Content Editing Implementation Plan

## Overview
This document outlines the implementation of a comprehensive content editing system for courses, assessments, and pathways in the CRITR application.

## Features Implemented

### 1. Edit Mode Toggle
- **Location**: IcHero sections of Courses, Assessments, and Pathways pages
- **Component**: IcToggle (using IcButton with toggle behavior)
- **Functionality**: 
  - When enabled: Shows only content owned by the current user (managerID = userID)
  - When disabled: Shows all available content

### 2. Content Filtering
- **Courses**: Filter by `courseManagerID` 
- **Assessments**: Filter by `manager_ID`
- **Pathways**: Filter by `pathwayManagerID`
- **Implementation**: Client-side filtering based on current user's `employeeID`

### 3. Alert System
- **Edit Mode ON**: "You are now in edit mode, click on your content to open edit dialog."
- **Edit Mode OFF**: "You have exited edit mode"
- **Type**: IcAlert with "info" variant (blue color)
- **Auto-dismiss**: Alerts automatically hide after 3 seconds

### 4. Edit Dialog System
- **Reuses existing creation dialogs**: Same forms used for creating content
- **Pre-population**: Current values automatically filled in form fields
- **Change Detection**: Monitors form changes to enable/disable submit button
- **Update Functionality**: PATCH/PUT requests to update database records

### 5. Delete Functionality  
- **Delete Button**: Added to each edit dialog
- **Confirmation Dialog**: IcDialog asking "Are you sure you want to delete this [content type]?"
- **Implementation**: DELETE request to backend with confirmation flow

## Technical Implementation

### Frontend Changes

#### 1. State Management
Each content page will have:
```javascript
const [editMode, setEditMode] = useState(false);
const [currentUser, setCurrentUser] = useState(null);
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [selectedContent, setSelectedContent] = useState(null);
const [formData, setFormData] = useState({});
const [hasChanges, setHasChanges] = useState(false);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
```

#### 2. Content Filtering Logic
```javascript
const getFilteredContent = (allContent, editMode, currentUser) => {
  if (!editMode || !currentUser) return allContent;
  
  return allContent.filter(item => {
    // For courses
    return item.courseManagerID === currentUser.employeeID;
    // For assessments  
    return item.manager_ID === currentUser.employeeID;
    // For pathways
    return item.pathwayManagerID === currentUser.employeeID;
  });
};
```

#### 3. Edit Toggle Component
```jsx
<IcButton
  slot="interaction"
  variant={editMode ? "primary" : "secondary"}
  onClick={() => {
    setEditMode(!editMode);
    setAlertVisible(true);
    setAlertMessage(editMode ? 
      "You have exited edit mode" : 
      "You are now in edit mode, click on your content to open edit dialog."
    );
  }}
>
  <SlottedSVGTemplate mdiIcon={editMode ? mdiToggleSwitch : mdiToggleSwitchOff} />
  Edit Mode
</IcButton>
```

### Backend Endpoints Required

#### For Courses:
- `PUT /CourseCatalogue/updateCourse` - Update course details
- `DELETE /CourseCatalogue/deleteCourse/:courseId` - Delete course

#### For Assessments:
- `PUT /CourseCatalogue/updateAssessment` - Update assessment details  
- `DELETE /CourseCatalogue/deleteAssessment/:assessmentId` - Delete assessment

#### For Pathways:
- `PUT /pathways/updatePathway` - Update pathway details
- `DELETE /pathways/deletePathway/:pathwayId` - Delete pathway

### Database Operations
- **Updates**: PATCH existing records with new field values
- **Deletes**: CASCADE delete with related enrollments/relationships handled appropriately 
- **Validation**: Ensure only managers can edit/delete their own content

## Files Modified

### Frontend Files:
1. `src/pages/CourseCatalogue.jsx` - Added edit mode toggle and functionality
2. `src/pages/Courses.jsx` - Added edit mode toggle and functionality  
3. `src/pages/Assessments.jsx` - Added edit mode toggle and functionality
4. `src/pages/Pathways.jsx` - Added edit mode toggle and functionality

### Backend Files:
1. `Backend/routes/courseCatalogue.js` - Added update/delete endpoints for courses and assessments
2. `Backend/routes/pathways.js` - Added update/delete endpoints for pathways
3. `Backend/services/CourseCatalogue.js` - Added update/delete service methods
4. `Backend/services/pathways.js` - Added update/delete service methods

## Usage Flow

1. **User visits content page** (Courses/Assessments/Pathways)
2. **Toggle Edit Mode ON**:
   - Content filters to show only user's managed items
   - Info alert appears
3. **Click on owned content**:
   - Edit dialog opens with pre-populated values
   - User makes changes
   - Submit button becomes enabled when changes detected
4. **Save Changes**:
   - Form submits with PATCH request
   - Success alert appears
   - Content refreshes with updated data
5. **Delete Content** (optional):
   - Click delete button in edit dialog
   - Confirmation dialog appears
   - User confirms deletion
   - DELETE request sent
   - Content removed from view

## Security Considerations

- **Authorization**: Backend validates user owns content before allowing edits/deletes
- **Authentication**: All requests require valid session tokens
- **Validation**: Client and server-side validation of form data
- **Error Handling**: Comprehensive error messages and fallback behavior

## Testing Scenarios

1. Edit mode toggle functionality
2. Content filtering accuracy  
3. Form pre-population with existing data
4. Change detection for submit button state
5. Successful content updates
6. Delete confirmation flow
7. Error handling for unauthorized access
8. Cross-user content isolation (can't edit others' content)

This implementation provides a comprehensive content management system that maintains the existing user experience while adding powerful editing capabilities for content owners.

## Final Fixes and Refinements

### 1. Alert System Corrections
**Issue**: IcAlert components were defaulting to "error" variant instead of showing "info" for edit mode toggles.
**Fix**: Updated IcAlert variant logic in all pages:
```javascript
variant={alertType === "success" ? "success" : alertType === "info" ? "info" : "error"}
```

### 2. Data Type Validation
**Issue**: Course duration was using `parseFloat()` but database expects `Int` type.
**Fix**: Changed frontend form submission to use `parseInt()` for course duration field:
```javascript
duration: parseInt(editFormData.duration)
```

### 3. Enhanced Error Logging
**Added**: Comprehensive debugging for edit operations:
```javascript
console.log('Sending update request:', {
  endpoint,
  requestData,
  hasToken: document.cookie.includes('x-auth-token')
});
console.log('Update response status:', response.status);
```

### 4. Syntax Error Fixes
**Resolved**:
- Duplicate variable declarations in Pathways.jsx (`useDialogs`, `searchSelection`, `courseAssessmentExperienceOptions`, `searchMatch`)
- Orphaned JSX fragments in Assessments.jsx causing parser errors
- Extra closing parentheses in Courses.jsx IIFE expressions

### 5. Backend Server Dependency
**Critical**: Edit functionality requires backend server to be running on `localhost:5000`
- Start with: `cd Backend && node server.js`
- Without running server: 404 errors and failed authentication
- All CRUD endpoints are properly implemented and functional

## Current Page Structure and Functionality

### Pages Directory Structure (Cleaned - February 2026)

All remaining 14 files are actively used:

| File | Status | Purpose |
|------|--------|---------|
| **AssessmentManagement.jsx** | ✅ Active | Full assessment management system with tabs, CRUD operations, comprehensive assessment administration |
| **AssessmentScoring.jsx** | ✅ Active | Simplified scoring interface for referees to grade assessments |
| **Assessments.jsx** | ✅ Active | Individual assessments browsing and enrollment |
| **CourseCatalogue.jsx** | ✅ Active | Full course & assessment catalogue with search and filtering |
| **CourseManagement.jsx** | ✅ Active | Course management system for administrators |
| **Courses.jsx** | ✅ Active | Individual courses browsing and enrollment |
| **ExperienceFeedback.jsx** | ✅ Active | Experience feedback management for referees |
| **Home.jsx** | ✅ Active | Redesigned homepage with consistent IcCard navigation |
| **Login.jsx** | ✅ Active | User authentication interface |
| **Manage.jsx** | ✅ Active | General management interface |
| **PathwayManagement.jsx** | ✅ Active | Pathway administration and creation |
| **Pathways.jsx** | ✅ Active | Learning pathway browsing and enrollment |
| **Record.jsx** | ✅ Active | Individual training record with courses, assessments, and experiences |
| **Register.jsx** | ✅ Active | User registration interface |

### Files Removed During Cleanup
- **Feedback.jsx** - Legacy unused file (248 lines) - superseded by ExperienceFeedback.jsx

### Navigation Consistency Updates
- **Unified Top Navigation**: All pages now have consistent navigation tabs matching homepage order
- **Lightning Bolt Icon**: Consistent brand icon across all headers
- **Seven Main Sections**: Your Record, Pathways, Individual Courses, Individual Assessments, Course Management, Assessment Management, Feedback Management