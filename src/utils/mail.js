import Mailgen from "mailgen";
import nodemailer from "nodemailer"

const sendEmail = async (options)=>{
    const mailGenerator = new Mailgen({
        theme:"default",
        product:{
             name:"Task Manager",
             link:"https://taskmanagelink.com"
        }
    })

    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
    const emailHtml = mailGenerator.generate(options.mailgenContent)

   const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
const mail = {
    from: process.env.GMAIL_USER,
    to:options.email,
    subject:options.subject,
    text:emailTextual,
    html:emailHtml
}
try {
   const info = await transporter.sendMail(mail)
   console.log("Email sent:", info.response);

} catch (error) {
    console.error("email serivce failed silently,");
    console.error("error",error);
    
    
}
}

const emailVerificationMailgenContent = (username,verificationUrl)=>{
    return {
        body:{
            name:username,
            intro:"welcome to our App!we're excited to have you on board",
            action:{
                instructions:"to verify your email please click on the following button",
                button:{
                    color:"#1aae5aff",
                    text:"Verify your Email",
                    link:verificationUrl
                },
            },
            outro:"Need help?just reply to this email and we'd love to help"
        },
    }
}

const forgotPasswordMailgenContent = (username,verificationUrl)=>{
    return {
        body:{
            name:username,
            intro:"we got a request to reset the password of your account",
            action:{
                instructions:"to reset your password please click on the following button",
                button:{
                    color:"#22BC66",
                    text:"Reset password",
                    link:verificationUrl
                },
            },
            outro:"Need help?just reply to this email and we'd love to help"
        },
    }
}
export {sendEmail,forgotPasswordMailgenContent,emailVerificationMailgenContent}