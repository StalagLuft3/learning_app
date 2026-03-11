# API Standardization Guide
*Development Team Reference - March 2026*

## 📋 Overview

The application has successfully transitioned from server-side rendering to a modern API-based architecture. This guide documents the standardization efforts and provides patterns for consistent API implementation.

## ✅ Completed Standardizations

### 1. **Backend Error Response Format**
All API endpoints now return consistent error responses:

```json
// ✅ Standardized Format
{ 
  "error": "Error message here"
}

// ❌ Old Inconsistent Formats (Fixed)
{ "errors": "Error message" }
{ "section": "...", "error": "..." }
```

### 2. **Server-Side Rendering Cleanup**
- ✅ All `res.render()` calls removed/commented out
- ✅ All `res.redirect()` calls removed/commented out  
- ✅ All routes return JSON responses
- ✅ Deprecated code cleaned from route files

### 3. **Service Architecture Consolidation**
- ✅ Eliminated `manageContents.js` service duplication
- ✅ Clear service responsibilities:
  - `managePathways.js` - Pathway + content management
  - `manageCourses.js` - Course management  
  - `manageAssessments.js` - Assessment management
  - `pathways.js` - Basic pathway CRUD
  - `feedback.js` - Experience feedback management

## 🎯 Frontend API Utility (Enhanced)

### New Centralized API Functions
Location: `frontEnd/src/commonFunctions/api.js`

```javascript
// GET requests
import { fetchData } from '../commonFunctions/api';
const userData = await fetchData('/Auth/user');

// POST requests  
import { postData } from '../commonFunctions/api';
const result = await postData('/Auth/login', { email, password });

// PUT requests
import { putData } from '../commonFunctions/api';
const updated = await putData('/pathways/123', { name: 'New Name' });

// DELETE requests
import { deleteData } from '../commonFunctions/api';
await deleteData('/courses/456');
```

### Benefits of New API Utility
- ✅ **Centralized error handling** - Consistent across all requests
- ✅ **Automatic credential inclusion** - No more manual `credentials: 'include'`
- ✅ **Unified error format handling** - Works with both `error` and legacy `errors`
- ✅ **Single configuration point** - Easy to change base URL or headers
- ✅ **Proper JSON parsing** - Automatic request/response handling

## 📊 Current Implementation Status

### ✅ Fully Standardized Components
- Login.jsx (Example implementation)
- All backend routes (error format)
- Core API services (consolidated)

### ⚠️ Needs Migration (47+ components)
Components still using direct `fetch()` calls with hardcoded URLs:

**High Priority:**
- AssessmentManagement.jsx (5 fetch calls)
- CourseManagement.jsx (4 fetch calls)  
- PathwayManagement.jsx (3 fetch calls)
- CourseCatalogue.jsx (4 fetch calls)

**Medium Priority:**
- ExperienceTemplateManagement.jsx
- ExperienceFeedback.jsx
- Assessments.jsx
- Courses.jsx

## 🚀 Migration Pattern

### Before (Inconsistent):
```javascript
// ❌ Old Pattern - Multiple Issues
const response = await fetch('http://localhost:5000/ManageContents/updateCourse', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(data)
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || error.errors || 'Request failed');
}

const result = await response.json();
```

### After (Standardized):
```javascript  
// ✅ New Pattern - Clean & Consistent
import { putData } from '../commonFunctions/api';

try {
  const result = await putData('/ManageContents/updateCourse', data);
  // Handle success
} catch (error) {
  // Handle error - message is already standardized
  console.error('Update failed:', error.message);
}
```

## 🛠️ Implementation Checklist

### For Each Component Migration:

1. **Add API import:**
   ```javascript
   import { fetchData, postData, putData, deleteData } from '../commonFunctions/api';
   ```

2. **Replace GET requests:**
   ```javascript
   // Old: const response = await fetch('http://localhost:5000/endpoint', {...});
   // New: const data = await fetchData('/endpoint');
   ```

3. **Replace POST/PUT requests:**
   ```javascript
   // Old: fetch('http://localhost:5000/endpoint', { method: 'POST', body: ... })
   // New: const result = await postData('/endpoint', data);
   ```

4. **Simplify error handling:**
   ```javascript
   // The API utility throws errors automatically
   // Just catch and handle the error.message
   ```

5. **Remove duplicate error parsing:**
   ```javascript
   // No need to check response.ok or parse errors manually
   // The utility handles both { error: "..." } and { errors: "..." }
   ```

## 📈 Expected Benefits

### Development Experience:
- 🚀 **50% less boilerplate** code for API calls
- 🧹 **Consistent error handling** across all components  
- 🔧 **Single point of configuration** for API settings
- 📝 **Better maintainability** and debugging

### Runtime Benefits:
- ⚡ **Standardized error messages** for users
- 🚨 **Consistent loading states** and error recovery
- 🔒 **Reliable authentication** handling
- 🌐 **Easier environment configuration** (dev/staging/prod)

## 🎯 Next Steps

### Immediate (This Sprint):
1. **Migrate high-priority components** (AssessmentManagement, CourseManagement, PathwayManagement)
2. **Test error handling** consistency across migrated components
3. **Update any remaining route error formats**

### Short Term (Next Sprint):  
1. **Migrate remaining components** to new API pattern
2. **Add request/response interceptors** for loading states
3. **Implement retry logic** for failed requests

### Long Term:
1. **Add TypeScript definitions** for API responses
2. **Implement request caching** where appropriate  
3. **Add API monitoring/analytics**

## 🔧 Configuration Management

### Environment-Specific URLs:
```javascript
// api.js can be enhanced for different environments:
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
```

### Future Enhancements:
- Request/response logging
- Automatic retry on network failures  
- Request timeout configuration
- Loading state management
- Response caching

---

## 📞 Support

For questions about this standardization effort or migration assistance:
- Review this guide and the example implementation in Login.jsx
- Check the enhanced api.js utility for available functions
- Test changes thoroughly with both success and error scenarios

**The goal:** Every API call in the application should use the centralized utility functions for consistency, maintainability, and better user experience.