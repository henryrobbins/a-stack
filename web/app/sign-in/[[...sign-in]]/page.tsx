import { SignIn } from '@clerk/nextjs';

function SignInPage() {
  return (
    <div className="flex justify-center px-pad py-16">
      <SignIn />
    </div>
  );
}

export default SignInPage;
