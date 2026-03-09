const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET / email search
async function search(email){
  const result = await prisma.employees.findMany({
    where: { email: email },
    select: { 
      employeeID: true,
      email: true, 
      password: true,
      username: true,
      role: true
    },
    take: 1
  });
  return {
    result
  }
}

// POST / REGISTER
async function register(email, password, username, role){
  const result = await prisma.employees.create({
    data: {
      username: username,
      role: role,
      email: email,
      password: password
    }
  });
  let message = 'Error >> Insert Failed';

  if (result.employeeID) {
    message = `New account registered for ${email}`;
  }
  return {message};
}

// EXPORTS
module.exports = {
  search,
  register 
}