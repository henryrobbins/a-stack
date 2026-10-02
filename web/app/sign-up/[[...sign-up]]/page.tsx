import { SignUp } from '@clerk/nextjs';

function SignUpPage() {
  return (
    <div className="flex justify-center px-pad py-16">
      <SignUp />
    </div>
  );
}

export default SignUpPage;
