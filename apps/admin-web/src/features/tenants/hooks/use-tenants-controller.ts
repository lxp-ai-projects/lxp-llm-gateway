import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  adminApiClient,
  type AdminTenantMembershipSummary,
  type AdminTenantSummary,
} from '../../../lib/api-client';
import { getActiveTenantLabel } from '../../../lib/tenant-context';
import { useSession } from '../../../lib/use-session';

export function useTenantsController() {
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [createOpened, createControls] = useDisclosure(false);
  const [createMemberOpened, createMemberControls] = useDisclosure(false);
  const [editMemberOpened, editMemberControls] = useDisclosure(false);
  const [editGlobalRolesOpened, editGlobalRolesControls] = useDisclosure(false);
  const [createSlug, setCreateSlug] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createAllowOverride, setCreateAllowOverride] = useState(true);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAllowOverride, setEditAllowOverride] = useState(true);
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [memberDisplayName, setMemberDisplayName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRoles, setMemberRoles] = useState<string[]>(['user']);
  const [selectedMembership, setSelectedMembership] =
    useState<AdminTenantMembershipSummary | null>(null);
  const [editMemberRoles, setEditMemberRoles] = useState<string[]>([]);
  const [editMemberStatus, setEditMemberStatus] =
    useState<'active' | 'disabled'>('active');
  const [editGlobalRoles, setEditGlobalRoles] = useState<string[]>([]);
  const selectedMembershipIsProtected =
    selectedMembership?.globalRoles.includes('super_admin') ?? false;
  const selectedMembershipIsSelf =
    selectedMembership?.userUuid === sessionQuery.data?.userUuid;

  const tenantsQuery = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApiClient.getTenants(),
  });

  const selectedTenant =
    tenantsQuery.data?.find((tenant) => tenant.id === selectedTenantId) ?? null;

  useEffect(() => {
    if (!selectedTenantId && tenantsQuery.data?.length) {
      setSelectedTenantId(tenantsQuery.data[0].id);
    }
  }, [selectedTenantId, tenantsQuery.data]);

  useEffect(() => {
    if (!selectedTenant) {
      return;
    }

    setEditDisplayName(selectedTenant.displayName);
    setEditAllowOverride(selectedTenant.allowUserCredentialOverride);
    setEditStatus(selectedTenant.status);
  }, [selectedTenant]);

  const membershipsQuery = useQuery({
    queryKey: ['admin-tenant-memberships', selectedTenantId],
    queryFn: () => adminApiClient.getTenantMemberships(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });

  const createTenantMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenant({
        slug: createSlug.trim(),
        displayName: createDisplayName.trim(),
        allowUserCredentialOverride: createAllowOverride,
      }),
    onSuccess: async (tenant) => {
      resetCreateForm();
      createControls.close();
      setSelectedTenantId(tenant.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenant(selectedTenantId!, {
        displayName: editDisplayName.trim(),
        allowUserCredentialOverride: editAllowOverride,
        status: editStatus,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
    },
  });

  const createTenantUserMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenantUser(selectedTenantId!, {
        email: memberEmail.trim(),
        password: memberPassword,
        displayName: memberDisplayName.trim(),
        roles: memberRoles,
      }),
    onSuccess: async () => {
      resetMemberForm();
      createMemberControls.close();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });

  const updateTenantUserMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantUser(
        selectedTenantId!,
        selectedMembership!.userUuid,
        {
          roles: editMemberRoles,
          status: editMemberStatus,
        },
      ),
    onSuccess: async () => {
      editMemberControls.close();
      setSelectedMembership(null);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
    },
  });
  const updateGlobalRolesMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateUserGlobalRoles(selectedMembership!.userUuid, {
        globalRoles: editGlobalRoles,
      }),
    onSuccess: async () => {
      editGlobalRolesControls.close();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const tenantCards = useMemo(
    () => tenantsQuery.data ?? [],
    [tenantsQuery.data],
  );

  function resetCreateForm() {
    setCreateSlug('');
    setCreateDisplayName('');
    setCreateAllowOverride(true);
  }

  function resetMemberForm() {
    setMemberDisplayName('');
    setMemberEmail('');
    setMemberPassword('');
    setMemberRoles(['user']);
  }

  function handleCreateTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createSlug.trim() || !createDisplayName.trim()) {
      return;
    }

    createTenantMutation.mutate();
  }

  function handleUpdateTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantId || !editDisplayName.trim()) {
      return;
    }

    updateTenantMutation.mutate();
  }

  function handleCreateTenantUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantId || !memberEmail.trim()) {
      return;
    }

    const isProvisioningNewUser =
      memberDisplayName.trim().length > 0 || memberPassword.trim().length > 0;
    if (
      isProvisioningNewUser &&
      (!memberDisplayName.trim() || memberPassword.trim().length < 8)
    ) {
      return;
    }

    createTenantUserMutation.mutate();
  }

  function handleUpdateTenantUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedTenantId ||
      !selectedMembership ||
      selectedMembershipIsProtected
    ) {
      return;
    }

    updateTenantUserMutation.mutate();
  }

  function handleUpdateGlobalRolesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMembership) {
      return;
    }

    updateGlobalRolesMutation.mutate();
  }

  return {
    createMemberDisplayName: memberDisplayName,
    createMemberEmail: memberEmail,
    createMemberOpened,
    createMemberPassword: memberPassword,
    createMemberRoles: memberRoles,
    createAllowOverride,
    createDisplayName,
    createOpened,
    createSlug,
    editGlobalRoles,
    editGlobalRolesOpened,
    editMemberOpened,
    editMemberRoles,
    editMemberStatus,
    handleCreateTenantSubmit,
    handleCreateTenantUserSubmit,
    handleUpdateGlobalRolesSubmit,
    handleUpdateTenantSubmit,
    handleUpdateTenantUserSubmit,
    isCreatePending: createTenantMutation.isPending,
    isCreateTenantUserPending: createTenantUserMutation.isPending,
    isUpdateGlobalRolesPending: updateGlobalRolesMutation.isPending,
    isUpdatePending: updateTenantMutation.isPending,
    isUpdateTenantUserPending: updateTenantUserMutation.isPending,
    memberships: membershipsQuery.data ?? [],
    membershipsQuery,
    onCloseCreate: () => {
      createControls.close();
      resetCreateForm();
    },
    onCloseCreateMember: () => {
      createMemberControls.close();
      resetMemberForm();
    },
    onCreateAllowOverrideChange: setCreateAllowOverride,
    onCreateDisplayNameChange: setCreateDisplayName,
    onCreateSlugChange: setCreateSlug,
    onOpenCreate: createControls.open,
    onOpenCreateMember: createMemberControls.open,
    onCreateMemberDisplayNameChange: setMemberDisplayName,
    onCreateMemberEmailChange: setMemberEmail,
    onCreateMemberPasswordChange: setMemberPassword,
    onCreateMemberRolesChange: setMemberRoles,
    onSelectTenant: (tenant: AdminTenantSummary) => setSelectedTenantId(tenant.id),
    onEditAllowOverrideChange: setEditAllowOverride,
    onEditDisplayNameChange: setEditDisplayName,
    onEditGlobalRolesChange: setEditGlobalRoles,
    onEditMemberRolesChange: setEditMemberRoles,
    onEditMemberStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditMemberStatus(value);
      }
    },
    onOpenEditMember: (membership: AdminTenantMembershipSummary) => {
      setSelectedMembership(membership);
      setEditMemberRoles(membership.roles);
      setEditMemberStatus(membership.status);
      editMemberControls.open();
    },
    onCloseEditMember: () => {
      editMemberControls.close();
      setSelectedMembership(null);
    },
    onOpenEditGlobalRoles: (membership: AdminTenantMembershipSummary) => {
      setSelectedMembership(membership);
      setEditGlobalRoles(membership.globalRoles);
      editGlobalRolesControls.open();
    },
    onCloseEditGlobalRoles: () => {
      editGlobalRolesControls.close();
      setSelectedMembership(null);
      setEditGlobalRoles([]);
    },
    onEditStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditStatus(value);
      }
    },
    activeTenantLabel: getActiveTenantLabel(sessionQuery.data),
    selectedMembershipIsSelf,
    selectedMembershipIsProtected,
    selectedMembership,
    selectedTenant,
    tenantCards,
    tenantsQuery,
    updateGlobalRolesError:
      updateGlobalRolesMutation.error instanceof Error
        ? updateGlobalRolesMutation.error.message
        : null,
    editAllowOverride,
    editDisplayName,
    editStatus,
  };
}
