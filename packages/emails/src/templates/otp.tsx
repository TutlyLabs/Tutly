import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

const OTPEmail = ({ otp }: { otp: string }) => {
  return (
    <Html>
      <Head />
      <Preview>Your OTP for Tutly</Preview>
      <Body style={{ backgroundColor: "#ffffff" }}>
        <Container>
          <Heading>Your One-Time Password</Heading>
          <Text>Your OTP is: {otp}</Text>
          <Text>This OTP will expire shortly. Please use it soon.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const reactOTPEmail = (props: { otp: string }) => (
  <OTPEmail {...props} />
);
