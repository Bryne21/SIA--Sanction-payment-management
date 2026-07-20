import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Button
} from '@mui/material';

function MembersList({ members = [], sanctions = [] }) {
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const normalizeOrganizationValue = (value) => {
    if (value === undefined || value === null || value === '') return '';
    return String(value).trim();
  };

  const sanctionedMemberIds = useMemo(() => {
    return new Set(
      (Array.isArray(sanctions) ? sanctions : [])
        .map((sanction) => sanction.memberId || sanction.studentId || sanction.member || sanction.id)
        .filter(Boolean)
    );
  }, [sanctions]);

  const organizationOptions = useMemo(() => {
    const values = members
      .filter((member) => sanctionedMemberIds.has(member.id || member.studentId || member._id))
      .map((member) => normalizeOrganizationValue(member.organizationID || member.organizationId || member.organizationClub || member.organization || member.org || member.organizationName || member.orgName))
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [members, sanctionedMemberIds]);

  const filteredMembers = useMemo(() => {
    const query = (search || '').toLowerCase();

    return members.filter((member) => {
      const memberKey = member.id || member.studentId || member._id;
      const isSanctioned = sanctionedMemberIds.has(memberKey);
      if (!isSanctioned) return false;

      const displayName = member.name || [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed';
      const organization = normalizeOrganizationValue(member.organizationID || member.organizationId || member.organizationClub || member.organization || member.org || member.organizationName || member.orgName);
      const matchesSearch = !query || displayName.toLowerCase().includes(query) || String(member.id || member.studentId || member._id || '').toLowerCase().includes(query) || String(member.course || '').toLowerCase().includes(query) || organization.toLowerCase().includes(query);
      const matchesOrganization = organizationFilter === 'all' || organization === organizationFilter;
      return matchesSearch && matchesOrganization;
    });
  }, [members, organizationFilter, sanctionedMemberIds, search]);

  useEffect(() => {
    setPage(1);
  }, [organizationFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  const paginatedMembers = filteredMembers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease-out' }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Members</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Filter members by organization.</Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search members" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Organization</InputLabel>
              <Select value={organizationFilter} label="Organization" onChange={(e) => setOrganizationFilter(e.target.value)}>
                <MenuItem value="all">All Organizations</MenuItem>
                {organizationOptions.map((organization) => (
                  <MenuItem key={organization} value={organization}>
                    {organization}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #eee' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f7f7f7' }}>
              <TableCell sx={{ fontWeight: 700 }}>Member ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMembers.map((member) => {
              const displayName = member.name || [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed';
              const organization = normalizeOrganizationValue(member.organizationID || member.organizationId || member.organizationClub || member.organization || member.org || member.organizationName || member.orgName);
              return (
                <TableRow key={member.id || member._id} hover>
                  <TableCell>{member.id || member.studentId || member._id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#800000' }}>{(displayName || 'U').split(' ').map((part) => part[0]).join('').slice(0, 2)}</Avatar>
                      <Typography sx={{ fontWeight: 600 }}>{displayName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{member.course || '—'}</TableCell>
                  <TableCell>{organization || '—'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>₱{member.balance || 0}</TableCell>
                </TableRow>
              );
            })}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No members found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredMembers.length)} - {Math.min(page * itemsPerPage, filteredMembers.length)} of {filteredMembers.length}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
              sx={{ minWidth: 32, height: 32, p: 0 }}
            >
              ‹
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                size="small"
                onClick={() => setPage(p)}
                sx={{
                  minWidth: 32,
                  height: 32,
                  p: 0,
                  backgroundColor: page === p ? '#800000' : 'transparent',
                  color: page === p ? '#ffffff' : '#1a1a1a',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: page === p ? '#800000' : '#f5f5f5'
                  }
                }}
              >
                {p}
              </Button>
            ))}
            <Button
              size="small"
              disabled={page === totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              sx={{ minWidth: 32, height: 32, p: 0 }}
            >
              ›
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

MembersList.propTypes = {
  members: PropTypes.array,
  sanctions: PropTypes.array
};

export default MembersList;
