function Grabber() {
  return <div className="bg-[#cccccc] h-[5px] rounded-[100px] shrink-0 w-[36px]" data-name="Grabber" />;
}

export default function Grabber1() {
  return (
    <div className="box-border content-stretch flex flex-col items-start pb-0 pt-[5px] px-0 relative size-full" data-name="Grabber">
      <Grabber />
    </div>
  );
}