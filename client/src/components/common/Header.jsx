import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { completionService } from '../../services/completionService';
import './Header.css';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [totalCompletions, setTotalCompletions] = useState(0);

  useEffect(() => {
    const loadTotalCompletions = async () => {
      try {
        const count = await completionService.getTotalCompletions();
        setTotalCompletions(count);
      } catch (error) {
        console.error('Failed to load total completions:', error);
      }
    };
    loadTotalCompletions();
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="app-header">
      <h1 className="app-title" onClick={() => navigate('/')}>habits</h1>
      <div className="header-actions">
        <div className="trophy-section">
          <svg className="trophy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9C6 10.5913 6.63214 12.1174 7.75736 13.2426C8.88258 14.3679 10.4087 15 12 15C13.5913 15 15.1174 14.3679 16.2426 13.2426C17.3679 12.1174 18 10.5913 18 9V5H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 5H4C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7C2 7.53043 2.21071 8.03914 2.58579 8.41421C2.96086 8.78929 3.46957 9 4 9H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18 5H20C20.5304 5 21.0391 5.21071 21.4142 5.58579C21.7893 5.96086 22 6.46957 22 7C22 7.53043 21.7893 8.03914 21.4142 8.41421C21.0391 8.78929 20.5304 9 20 9H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 15V19H15V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 19H15V21H9V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="trophy-count">{totalCompletions}</span>
        </div>

        <div className="user-menu">
          <button
            className="user-menu-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg className="user-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{user?.username}</span>
            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="user-dropdown">
              <button
                className={`dropdown-item ${isActive('/') ? 'active' : ''}`}
                onClick={() => handleNavigate('/')}
              >
                Board
              </button>
              <button
                className={`dropdown-item ${isActive('/archive') ? 'active' : ''}`}
                onClick={() => handleNavigate('/archive')}
              >
                Archive
              </button>
              <button
                className={`dropdown-item ${isActive('/settings') ? 'active' : ''}`}
                onClick={() => handleNavigate('/settings')}
              >
                Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
