import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/db';
import { Program, UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile;
  users: UserProfile[];
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  isCoE: boolean;
  isCoordinator: boolean;
  canUploadExcel: boolean;
  canManagePrograms: boolean;
  canChangeUserPasswords: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => { success: boolean; error?: string };
  changeOwnPassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };
  changeUserPassword: (targetUserId: string, newPassword: string) => { success: boolean; error?: string };
  switchUser: (userId: string) => void;
  updateCurrentUser: (user: UserProfile) => void;
  getUserRoleLabel: (role: UserRole) => string;
  getUserPrograms: (userId?: string) => { primary: Program[]; alternate: Program[]; all: Program[] };
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => db.getCurrentUser());
  const [users, setUsers] = useState<UserProfile[]>(() => db.getUsers());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => db.isLoggedIn());

  const refreshUsers = () => {
    const updatedUsers = db.getUsers();
    setUsers(updatedUsers);
    const updatedCurrent = db.getCurrentUser();
    setCurrentUser(updatedCurrent);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const login = (email: string, password: string) => {
    const result = db.login(email, password);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsLoggedIn(true);
      return { success: true };
    }
    return { success: false, error: result.error || 'Authentication failed' };
  };

  const logout = () => {
    db.logout();
    setIsLoggedIn(false);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const result = db.updateUserProfile(currentUser.id, updates);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      refreshUsers();
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to update profile' };
  };

  const changeOwnPassword = (currentPassword: string, newPassword: string) => {
    const userInDb = db.getUserById(currentUser.id);
    const expected = userInDb?.password || 'Admin@123';
    if (currentPassword !== expected) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    const result = db.updateUserPassword(currentUser.id, newPassword, `${currentUser.full_name} (Self)`);
    if (result.success) {
      refreshUsers();
    }
    return result;
  };

  const changeUserPassword = (targetUserId: string, newPassword: string) => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Only CoE, DyCoE, and ACoE can modify user credentials.' };
    }
    const result = db.updateUserPassword(targetUserId, newPassword, currentUser.full_name);
    if (result.success) {
      refreshUsers();
    }
    return result;
  };

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      db.setCurrentUser(user);
    }
  };

  const updateCurrentUser = (user: UserProfile) => {
    setCurrentUser(user);
    db.setCurrentUser(user);
  };

  const isSuperAdmin = ['COE', 'DYCOE', 'ACOE'].includes(currentUser.role);
  const isCoE = currentUser.role === 'COE';
  const isCoordinator = currentUser.role === 'COORDINATOR';

  const canUploadExcel = isSuperAdmin;
  const canManagePrograms = isSuperAdmin;
  const canChangeUserPasswords = isSuperAdmin;

  const getUserRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'COE':
        return 'Controller of Examinations (CoE)';
      case 'DYCOE':
        return 'Deputy Controller of Examinations (DyCoE)';
      case 'ACOE':
        return 'Assistant Controller of Examinations (ACoE)';
      case 'COORDINATOR':
        return 'Exam Coordinator';
      default:
        return role;
    }
  };

  const getUserPrograms = (userId = currentUser.id) => {
    const allPrograms = db.getPrograms();
    if (isSuperAdmin && userId === currentUser.id) {
      return {
        primary: allPrograms,
        alternate: [],
        all: allPrograms,
      };
    }
    const primary = allPrograms.filter((p) => p.primary_coordinator_id === userId);
    const alternate = allPrograms.filter((p) => p.alternate_coordinator_id === userId);
    const all = [...primary, ...alternate];
    return { primary, alternate, all };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoggedIn,
        isSuperAdmin,
        isCoE,
        isCoordinator,
        canUploadExcel,
        canManagePrograms,
        canChangeUserPasswords,
        login,
        logout,
        updateProfile,
        changeOwnPassword,
        changeUserPassword,
        switchUser,
        updateCurrentUser,
        getUserRoleLabel,
        getUserPrograms,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
