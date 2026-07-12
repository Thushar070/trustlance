const { encode } = require("next-auth/jwt");

async function main() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set in environment!");
  }
  
  // CLIENT (Profile Completed)
  const tokenClient = await encode({
    token: {
      email: "thushar2410612@ssn.edu.in",
      name: "Thushar T.L",
      picture: "",
      sub: "cmrhg4ehx0001cp8bay5ddwrv",
      id: "cmrhg4ehx0001cp8bay5ddwrv",
      role: "CLIENT",
      profileCompleted: true
    },
    secret: secret,
  });
  console.log("CLIENT_TOKEN=" + tokenClient);

  // FREELANCER (Profile Completed)
  const tokenFreelancer = await encode({
    token: {
      email: "thushartl0188@gmail.com",
      name: "Thushar TL",
      picture: "",
      sub: "cmrhhv7110003cpg7w19xinvn",
      id: "cmrhhv7110003cpg7w19xinvn",
      role: "FREELANCER",
      profileCompleted: true
    },
    secret: secret,
  });
  console.log("FREELANCER_TOKEN=" + tokenFreelancer);

  // ADMIN (Profile Completed)
  const tokenAdmin = await encode({
    token: {
      email: "thusharyyy@gmail.com",
      name: "Thushar Admin",
      picture: "",
      sub: "cmrhg4efn0000cp8b3mdorsll",
      id: "cmrhg4efn0000cp8b3mdorsll",
      role: "ADMIN",
      profileCompleted: true
    },
    secret: secret,
  });
  console.log("ADMIN_TOKEN=" + tokenAdmin);

  // FREELANCER (Incomplete Profile)
  const tokenIncompleteFreelancer = await encode({
    token: {
      email: "thushar.tl.dev@gmail.com",
      name: "Thushar Freelancer",
      picture: "",
      sub: "cmrhg4ej50002cp8bjo3nluoe",
      id: "cmrhg4ej50002cp8bjo3nluoe",
      role: "FREELANCER",
      profileCompleted: false
    },
    secret: secret,
  });
  console.log("INCOMPLETE_FREELANCER_TOKEN=" + tokenIncompleteFreelancer);

  // NEW USER (No Role, No Profile)
  const tokenNewUser = await encode({
    token: {
      email: "new_user_temp@gmail.com",
      name: "New User Temp",
      picture: "",
      sub: "new_user_temp_id_999",
      id: "new_user_temp_id_999",
      role: null,
      profileCompleted: false
    },
    secret: secret,
  });
  console.log("NEW_USER_TOKEN=" + tokenNewUser);
}

main().catch(console.error);
