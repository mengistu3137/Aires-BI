// 1. React Built-ins
import React, { useEffect } from 'react'

// 2. Third-Party Packages
import toast from 'react-hot-toast'

// 3. Absolute Alias Imports (@/*) sorted alphabetically
import { useRoles } from '@/features/roles/hooks/useRoles.js' // ✅ Aligned: Added query hook
import { useUi } from '@/hooks/useUi.js'

// 4. Relative Path Imports (../) sorted alphabetically
import { useCreateUser } from '../hooks/useCreateUser.js'
import { useResetUserPassword } from '../hooks/useResetUserPassword.js'
import { useUpdateUser } from '../hooks/useUpdateUser.js'
import { ResetPasswordForm } from './ResetPasswordForm.jsx'
import { UserForm } from './UserForm.jsx'

/**
 * Orchestrates user administrative dialog operations (Add, Edit, Reset Password)
 * by connecting presentational forms to TanStack Query mutation hooks.
 * Dynamically queries and binds system/custom workspace roles [15].
 */
export const UserModalContainer = ({ branches = [] }) => {
  const { activeModal, modalData, closeModal } = useUi()

  const { data: rolesResponse, error: rolesError, isError: isRolesError, isLoading: isLoadingRoles } = useRoles()
  useEffect(() => {
    if (isRolesError && rolesError) {
      console.error('❌ Failed to fetch custom roles from backend:', {
        message: rolesError.message,
        response: rolesError.response?.data || rolesError,
      })
    }
  }, [isRolesError, rolesError])
  
  const roles = rolesResponse?.data || []

  // Mutations
  const { mutate: createUser, isPending: isCreating } = useCreateUser()
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser()
  const { mutate: resetPassword, isPending: isResetting } = useResetUserPassword()

  // Render nothing if there is no active modal requested
  if (!activeModal) return null

  // Ensure this wrapper only handles user-specific modal frames
  const isUserModal = [
    'CREATE_USER_MODAL',
    'EDIT_USER_MODAL',
    'RESET_PASSWORD_MODAL',
  ].includes(activeModal)

  if (!isUserModal) return null

  // Action Dispatchers
  const handleCreateSubmit = (data) => {
    createUser(data, {
      onSuccess: () => {
        toast.success('User account created successfully')
        closeModal()
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to create user account')
      },
    })
  }

  const handleEditSubmit = (data) => {
    updateUser(
      {
        userId: modalData.id,
        userData: {
          name: data.name,
          email: data.email,
          role: data.role,
          branchId: data.branchId,
          version: modalData.version, // Enforce optimistic lock verification [1]
        },
      },
      {
        onSuccess: () => {
          toast.success('User details updated successfully')
          closeModal()
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update user details')
        },
      }
    )
  }

  const handleResetPasswordSubmit = (data) => {
    resetPassword(
      {
        userId: modalData.userId,
        password: data.password,
      },
      {
        onSuccess: () => {
          toast.success('User password reset successfully')
          closeModal()
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to reset password')
        },
      }
    )
  }

  const getModalTitle = () => {
    if (activeModal === 'CREATE_USER_MODAL') return 'Create User Account'
    if (activeModal === 'EDIT_USER_MODAL') return 'Edit User Details'
    if (activeModal === 'RESET_PASSWORD_MODAL') return 'Reset User Password'
    return ''
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeModal}
    >
      {/* Modal Inner Window */}
      <div
        className="w-full max-w-lg bg-surface rounded-2xl shadow-soft-xl border border-primary-100/60 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()} // Prevents inputs click events from closing the backdrop
      >
        {/* Modal Window Header */}
        <div className="flex items-center justify-between border-b border-primary-100/40 pb-3">
          <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
            {getModalTitle()}
          </h3>
          <button
            type="button"
            onClick={closeModal}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create User Form Frame */}
        {activeModal === 'CREATE_USER_MODAL' && (
          <UserForm
            mode="create"
            branches={branches}
            roles={roles} // ✅ Aligned: Passes dynamic roles to the creator form dropdown [15]
            onSubmit={handleCreateSubmit}
            onCancel={closeModal}
            isLoading={isCreating || isLoadingRoles}
          />
        )}

        {/* Edit User Form Frame */}
        {activeModal === 'EDIT_USER_MODAL' && (
          <UserForm
            mode="edit"
            defaultValues={{
              name: modalData?.name,
              email: modalData?.email,
              role: modalData?.role,
              branchId: modalData?.branchId,
            }}
            branches={branches}
            roles={roles} // ✅ Aligned: Passes dynamic roles to the editor form dropdown [15]
            onSubmit={handleEditSubmit}
            onCancel={closeModal}
            isLoading={isUpdating || isLoadingRoles}
          />
        )}

        {/* Reset Password Form Frame */}
        {activeModal === 'RESET_PASSWORD_MODAL' && (
          <ResetPasswordForm
            onSubmit={handleResetPasswordSubmit}
            onCancel={closeModal}
            isLoading={isResetting}
          />
        )}
      </div>
    </div>
  )
}