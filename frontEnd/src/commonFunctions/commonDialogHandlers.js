import { useState } from 'react';

const useDialogs = () => {
  const [dialogs, setDialogs] = useState({});
  const [selectedExperienceID, setSelectedExperienceID] = useState(null);

  const openDialog = (id, experienceID = null) => {
    setSelectedExperienceID(experienceID);
    setDialogs(prev => ({ ...prev, [id]: true }));
  };
  
  const closeDialog = (id) => setDialogs(prev => ({ ...prev, [id]: false }));
  const isDialogOpen = (id) => !!dialogs[id];

  return { isDialogOpen, openDialog, closeDialog, selectedExperienceID };
};

export { useDialogs };
