import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateNote from './CreateNote';
import EditNote from './EditNote';

const NotesRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/create" element={<CreateNote />} />
      <Route path="/:id" element={<EditNote />} />
    </Routes>
  );
};

export default NotesRouter;
