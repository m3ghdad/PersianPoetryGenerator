function Knob() {
  return <div className="absolute bg-white h-[24px] right-[2px] rounded-[100px] top-1/2 translate-y-[-50%] w-[39px]" data-name="Knob" />;
}

export default function ToggleSwitch() {
  return (
    <div className="bg-[#34c759] overflow-clip relative rounded-[100px] size-full" data-name="Toggle - Switch">
      <Knob />
    </div>
  );
}