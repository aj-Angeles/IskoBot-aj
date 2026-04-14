const COLLEGE_ROLES = [
  'College of Architecture',
  'College of Arts and Letters',
  'College of Education',
  'College of Engineering',
  'College of Fine Arts',
  'College of Home Economics',
  'College of Human Kinetics',
  'College of Law',
  'College of Media and Communication',
  'College of Music',
  'College of Science',
  'College of Social Sciences and Philosophy',
  'National College of Public Administration and Governance',
  'School of Economics',
  'School of Library and Information Studies',
  'School of Statistics',
];

const collegeChoices = COLLEGE_ROLES.map(name => ({ name, value: name }));

module.exports = { COLLEGE_ROLES, collegeChoices };
