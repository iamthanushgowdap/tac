
import type { User, UserProfile, Group, Branch, Semester } from '@/types';
import { defaultBranches, semesters } from '@/types';

// Helper function to get all users from localStorage
function getAllUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  const users: UserProfile[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('apsconnect_user_')) {
      try {
        users.push(JSON.parse(localStorage.getItem(key)!));
      } catch (e) {
        console.error(`Failed to parse user profile from key: ${key}`);
      }
    }
  }
  return users;
}

// Generates a group for a specific branch and semester
function generateGroupsFor(branch: Branch, semester: Semester): Group[] {
  return [
    {
      id: `${branch}_${semester}_official`.replace(/ & /g, '-').replace(/ /g, '-'),
      name: `${branch} - ${semester} Official`,
      type: 'official',
      branch,
      semester,
      description: `Official announcements for ${branch} ${semester}.`
    },
    {
      id: `${branch}_${semester}_student`.replace(/ & /g, '-').replace(/ /g, '-'),
      name: `${branch} - ${semester} Students`,
      type: 'student',
      branch,
      semester,
      description: `Peer discussion for ${branch} ${semester} students.`
    }
  ];
}

// Main function to get all groups a user belongs to
export async function getMyGroups(user: User): Promise<Group[]> {
  const myGroups: Group[] = [];
  
  if (user.role === 'admin') {
    // Admin is in all official groups
    const managedBranches = JSON.parse(localStorage.getItem('apsconnect_managed_branches') || JSON.stringify(defaultBranches));
    managedBranches.forEach((branch: Branch) => {
      semesters.forEach(semester => {
        myGroups.push(generateGroupsFor(branch, semester)[0]); // Add official group
      });
    });
  } else if (user.role === 'faculty') {
    // Faculty is in official groups for their assigned branches/semesters
    const assignedBranches = user.assignedBranches || [];
    const assignedSemesters = user.assignedSemesters || [];

    assignedBranches.forEach(branch => {
      if (assignedSemesters.length > 0) {
        assignedSemesters.forEach(semester => {
           myGroups.push(generateGroupsFor(branch, semester)[0]);
        });
      } else { // If no semester is assigned, they are in all sem groups for that branch
        semesters.forEach(semester => {
           myGroups.push(generateGroupsFor(branch, semester)[0]);
        });
      }
    });
  } else if (user.role === 'student' && user.branch && user.semester) {
    // Student is in both official and student groups for their class
    myGroups.push(...generateGroupsFor(user.branch, user.semester));
  }

  // Remove duplicates and sort
  const uniqueGroups = Array.from(new Map(myGroups.map(g => [g.id, g])).values());
  return uniqueGroups.sort((a, b) => a.name.localeCompare(b.name));
}

// Get a single group by its ID
export function getGroupById(groupId: string): Group | null {
    const parts = groupId.split('_');
    if (parts.length < 3) return null;
    
    // Handles branch names with hyphens that were replaced from spaces or ampersands
    const type = parts[parts.length - 1];
    const semester = parts[parts.length - 2].replace(/-/g, ' ');
    const branch = parts.slice(0, -2).join('_').replace(/-/g, ' ');

    if (![...defaultBranches, ...JSON.parse(localStorage.getItem('apsconnect_managed_branches') || '[]')].includes(branch)) {
      // A simple check; might need to be more robust if branches are fully dynamic
    }
    
    const allGroups = generateGroupsFor(branch as Branch, semester as Semester);
    return allGroups.find(g => g.id === groupId) || null;
}


// Get all members of a specific group
export function getGroupMembers(groupId: string): UserProfile[] {
    const group = getGroupById(groupId);
    if (!group) return [];

    const allUsers = getAllUsers();
    
    if (group.type === 'official') {
        return allUsers.filter(u => {
            // Admin is always in official groups
            if (u.role === 'admin') return true;
            // Students of that class
            if (u.role === 'student' && u.isApproved && u.branch === group.branch && u.semester === group.semester) return true;
            // Faculty assigned to that class
            if (u.role === 'faculty' && u.assignedBranches?.includes(group.branch)) {
                 if (!u.assignedSemesters || u.assignedSemesters.length === 0) return true; // Faculty assigned to all sems of the branch
                 if (u.assignedSemesters.includes(group.semester)) return true;
            }
            return false;
        });
    } else if (group.type === 'student') {
        return allUsers.filter(u => 
            u.role === 'student' && 
            u.isApproved && 
            u.branch === group.branch && 
            u.semester === group.semester
        );
    }
    
    return [];
}
