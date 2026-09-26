/** Local-only, real Supabase + HTTP smoke test. Never accepts a remote project. */
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";

async function main() {
  const local = JSON.parse(
    execFileSync("pnpm", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  assert.equal(
    new URL(local.API_URL).hostname,
    "127.0.0.1",
    "Only the local Supabase stack is allowed",
  );
  assert.equal(
    new URL(local.API_URL).port,
    "55431",
    "Use this starter's isolated test stack",
  );
  const key = local.PUBLISHABLE_KEY || local.ANON_KEY;
  const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const publicClient = () =>
    createClient(local.API_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const alice = publicClient();
  const bob = publicClient();
  const anonymous = publicClient();
  const userIds: string[] = [];
  const patientIds: string[] = [];
  const audioPaths: string[] = [];
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const aliceEmail = `alice-${run}@example.test`;
  const bobEmail = `bob-${run}@example.test`;
  let server: ReturnType<typeof spawn> | undefined;
  try {
    for (const [client, email] of [
      [alice, aliceEmail],
      [bob, bobEmail],
    ] as const) {
      const password = `local-only-${run}-Password1!`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(error, null);
      userIds.push(data.user!.id);
      assert.equal(
        (await client.auth.signInWithPassword({ email, password })).error,
        null,
      );
    }
    const { data: record, error } = await alice
      .from("ideas")
      .insert({
        title: "Private test idea",
        description: "Owner only",
        user_id: userIds[0],
      })
      .select()
      .single();
    assert.equal(error, null);
    assert.equal(
      (await alice.from("ideas").select().eq("id", record.id)).data?.length,
      1,
    );
    assert.equal(
      (await bob.from("ideas").select().eq("id", record.id)).data?.length,
      0,
    );
    assert.ok(
      (await anonymous.from("ideas").select()).error,
      "Anonymous reads are denied",
    );
    assert.ok(
      (
        await anonymous
          .from("ideas")
          .insert({ title: "Anonymous", user_id: userIds[0] })
      ).error,
    );
    assert.ok(
      (
        await bob
          .from("ideas")
          .insert({ title: "Forged owner", user_id: userIds[0] })
      ).error,
    );
    assert.equal(
      (
        await bob
          .from("ideas")
          .update({ title: "Intrusion" })
          .eq("id", record.id)
          .select()
      ).data?.length,
      0,
    );
    assert.equal(
      (await bob.from("ideas").delete().eq("id", record.id).select()).data
        ?.length,
      0,
    );
    assert.ok(
      (
        await alice
          .from("ideas")
          .update({ user_id: userIds[1] })
          .eq("id", record.id)
      ).error,
      "Ownership is immutable",
    );
    assert.ok(
      (await alice.from("ideas").insert({ title: "   ", user_id: userIds[0] }))
        .error,
    );
    assert.ok(
      (
        await alice.from("ideas").insert({
          title: "Too long",
          description: "x".repeat(2001),
          user_id: userIds[0],
        })
      ).error,
    );
    assert.equal(
      (
        await alice
          .from("ideas")
          .update({ title: "Updated" })
          .eq("id", record.id)
      ).error,
      null,
    );
    assert.equal(
      (await alice.from("ideas").select().eq("id", record.id).single()).data
        ?.title,
      "Updated",
    );
    assert.equal(
      (await alice.from("ideas").delete().eq("id", record.id)).error,
      null,
    );
    assert.equal(
      (await alice.from("ideas").select().eq("id", record.id)).data?.length,
      0,
    );
    console.log(
      "PASS: database CRUD, anonymous denial, cross-account isolation, immutable ownership and DB validation",
    );

    // Clinical records: shared between clinicians, closed to everyone else.
    const carol = publicClient();
    const carolEmail = `carol-${run}@example.test`;
    const carolPassword = `local-only-${run}-Password1!`;
    const { data: carolUser, error: carolError } =
      await admin.auth.admin.createUser({
        email: carolEmail,
        password: carolPassword,
        email_confirm: true,
      });
    assert.equal(carolError, null);
    userIds.push(carolUser.user!.id);
    assert.equal(
      (
        await carol.auth.signInWithPassword({
          email: carolEmail,
          password: carolPassword,
        })
      ).error,
      null,
    );
    assert.ok(
      (
        await carol
          .from("profiles")
          .update({ is_clinician: true })
          .eq("id", carolUser.user!.id)
      ).error,
      "Users cannot promote themselves to clinician",
    );
    assert.equal(
      (
        await admin
          .from("profiles")
          .update({ is_clinician: true })
          .in("id", [userIds[0], userIds[1]])
      ).error,
      null,
    );
    const { data: patient, error: patientError } = await alice
      .from("patients")
      .insert({
        first_name: "Integration",
        last_name: `Demo-${run}`,
        date_of_birth: "1990-01-01",
      })
      .select()
      .single();
    assert.equal(patientError, null);
    patientIds.push(patient!.id);
    assert.equal(patient!.created_by, userIds[0]);
    assert.equal(
      (await bob.from("patients").select().eq("id", patient!.id)).data?.length,
      1,
      "Clinicians share patients",
    );
    assert.equal(
      (await carol.from("patients").select().eq("id", patient!.id)).data
        ?.length,
      0,
      "Non-clinicians cannot read patients",
    );
    assert.ok(
      (await anonymous.from("patients").select()).error,
      "Anonymous patient reads are denied",
    );
    assert.ok(
      (
        await carol.from("patients").insert({
          first_name: "Blocked",
          last_name: "Demo",
          date_of_birth: "1990-01-01",
        })
      ).error,
      "Non-clinicians cannot create patients",
    );
    assert.ok(
      (
        await bob
          .from("consultations")
          .insert({ patient_id: patient!.id, doctor_id: userIds[0] })
      ).error,
      "Consultation authorship cannot be forged",
    );
    const { data: consultation, error: consultationError } = await bob
      .from("consultations")
      .insert({ patient_id: patient!.id })
      .select()
      .single();
    assert.equal(consultationError, null);
    assert.equal(consultation!.doctor_id, userIds[1]);
    assert.equal(consultation!.status, "recording");
    assert.equal(
      (
        await bob
          .from("consultations")
          .update({ transcript: "Fictional patient reports a mild cough." })
          .eq("id", consultation!.id)
      ).error,
      null,
    );
    assert.ok(
      (
        await bob
          .from("consultations")
          .update({ transcript: "Rewritten" })
          .eq("id", consultation!.id)
      ).error,
      "Raw transcripts are immutable",
    );
    assert.ok(
      (
        await bob
          .from("consultations")
          .update({ status: "finalised" })
          .eq("id", consultation!.id)
      ).error,
      "Finalising requires a final note",
    );
    const { data: finalised, error: finaliseError } = await bob
      .from("consultations")
      .update({
        status: "finalised",
        final_note: { reasonForVisit: "Cough", plan: "Rest and fluids" },
      })
      .eq("id", consultation!.id)
      .select()
      .single();
    assert.equal(finaliseError, null);
    assert.equal(finalised!.finalised_by, userIds[1]);
    assert.ok(finalised!.finalised_at);
    assert.ok(
      (
        await alice
          .from("consultations")
          .update({ final_note: { plan: "Changed" } })
          .eq("id", consultation!.id)
      ).error,
      "Finalised consultations are read-only",
    );
    const { data: timeline } = await alice
      .from("consultations")
      .select()
      .eq("patient_id", patient!.id);
    assert.equal(timeline?.[0]?.status, "finalised", "Clinicians share timelines");
    assert.equal(
      (await carol.from("consultations").select().eq("id", consultation!.id))
        .data?.length,
      0,
    );
    const audioPath = `${consultation!.id}/integration.webm`;
    const audio = new Blob([new Uint8Array([26, 69, 223, 163])], {
      type: "audio/webm",
    });
    assert.equal(
      (await bob.storage.from("consultation-audio").upload(audioPath, audio))
        .error,
      null,
    );
    audioPaths.push(audioPath);
    assert.ok(
      (
        await bob.storage
          .from("consultation-audio")
          .upload(audioPath, audio, { upsert: true })
      ).error,
      "Audio cannot be overwritten",
    );
    assert.ok(
      (
        await carol.storage
          .from("consultation-audio")
          .upload(`${consultation!.id}/carol.webm`, audio)
      ).error,
      "Non-clinicians cannot upload audio",
    );
    // Tasks: shared between clinicians, authorship and completion stamped by the database.
    const { data: task, error: taskError } = await alice
      .from("tasks")
      .insert({
        patient_id: patient!.id,
        consultation_id: consultation!.id,
        title: "Repeat bloods in 2 days",
        assigned_to: userIds[1],
        source: "note",
      })
      .select()
      .single();
    assert.equal(taskError, null);
    assert.equal(task!.created_by, userIds[0]);
    assert.equal(task!.status, "open");
    assert.ok(
      (
        await bob
          .from("tasks")
          .insert({ patient_id: patient!.id, title: "Forged", created_by: userIds[0] })
      ).error,
      "Task authorship cannot be forged",
    );
    assert.equal(
      (await carol.from("tasks").select().eq("id", task!.id)).data?.length,
      0,
      "Non-clinicians cannot read tasks",
    );
    assert.ok(
      (await carol.from("tasks").insert({ patient_id: patient!.id, title: "Blocked" })).error,
      "Non-clinicians cannot create tasks",
    );
    const { data: doneTask, error: doneError } = await bob
      .from("tasks")
      .update({ status: "done" })
      .eq("id", task!.id)
      .select()
      .single();
    assert.equal(doneError, null);
    assert.equal(doneTask!.completed_by, userIds[1], "The database stamps who completed a task");
    assert.ok(doneTask!.completed_at);
    assert.ok(
      (await alice.from("tasks").update({ completed_by: userIds[0] }).eq("id", task!.id)).error,
      "Task completion cannot be forged",
    );
    assert.ok(
      (await alice.from("tasks").delete().eq("id", task!.id)).error,
      "Tasks cannot be deleted",
    );
    const { data: reopened } = await alice
      .from("tasks")
      .update({ status: "open" })
      .eq("id", task!.id)
      .select()
      .single();
    assert.equal(reopened!.completed_by, null, "Reopening clears the completion stamp");
    console.log("PASS: shared tasks, forged authorship and completion denied, no deletes");
    // Roster: clinicians share and edit it; non-clinicians see nothing.
    const { data: shift, error: shiftError } = await alice
      .from("roster_shifts")
      .insert({
        staff_name: "Nurse Integration",
        role: "nurse",
        area: "Clinic",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 8 * 3_600_000).toISOString(),
      })
      .select()
      .single();
    assert.equal(shiftError, null);
    assert.equal(shift!.created_by, userIds[0]);
    assert.equal(
      (await bob.from("roster_shifts").select().eq("id", shift!.id)).data?.length,
      1,
      "Clinicians share the roster",
    );
    assert.equal(
      (await carol.from("roster_shifts").select().eq("id", shift!.id)).data?.length,
      0,
      "Non-clinicians cannot read the roster",
    );
    await carol.from("roster_shifts").delete().eq("id", shift!.id);
    assert.equal(
      (await bob.from("roster_shifts").select().eq("id", shift!.id)).data?.length,
      1,
      "Non-clinicians cannot remove shifts",
    );
    assert.ok(
      (
        await alice.from("roster_shifts").insert({
          staff_name: "Too long",
          role: "nurse",
          area: "Clinic",
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 30 * 3_600_000).toISOString(),
        })
      ).error,
      "Shifts are at most 24 hours",
    );
    assert.equal((await bob.from("roster_shifts").delete().eq("id", shift!.id)).error, null);

    // NHI: stored upper-case, unique, validated by the database.
    const nhi = `ZZZ${String(Math.floor(Math.random() * 9000) + 1000)}`;
    assert.equal(
      (await alice.from("patients").update({ nhi }).eq("id", patient!.id)).error,
      null,
    );
    assert.ok(
      (await alice.from("patients").update({ nhi: "not-an-nhi" }).eq("id", patient!.id)).error,
      "Invalid NHIs are rejected",
    );
    console.log("PASS: shared roster, non-clinician denial, shift length limit, NHI validation");

    console.log(
      "PASS: clinician sharing, non-clinician and anonymous denial, forged authorship, immutable transcript, finalisation lock and private audio",
    );

    const env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    };
    execFileSync("pnpm", ["build"], { env, stdio: "pipe" });
    const portProbe = createServer();
    portProbe.listen(0, "127.0.0.1");
    await once(portProbe, "listening");
    const address = portProbe.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve) => portProbe.close(() => resolve()));
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { env, stdio: "ignore" },
    );
    const origin = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const cookies = new Map<string, string>();
    async function request(path: string, init: RequestInit = {}) {
      const response = await fetch(`${origin}${path}`, {
        ...init,
        redirect: "manual",
        headers: {
          Cookie: [...cookies]
            .map(([name, value]) => `${name}=${value}`)
            .join("; "),
          Origin: origin,
          ...init.headers,
        },
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [part] = cookie.split(";");
        const i = part.indexOf("=");
        cookies.set(part.slice(0, i), part.slice(i + 1));
      }
      return response;
    }
    async function submit(
      path: string,
      html: string,
      selector: string,
      fields: Record<string, string>,
    ) {
      const $ = load(html);
      const form = $(selector).first();
      assert.ok(form.length, `Missing form ${selector}`);
      const body = new FormData();
      form.find('input[type="hidden"]').each((_, input) => {
        body.append($(input).attr("name")!, $(input).attr("value") ?? "");
      });
      for (const [name, value] of Object.entries(fields)) body.set(name, value);
      return request(path, { method: "POST", body });
    }
    let response = await request("/api/patients");
    assert.equal(response.status, 401, "Anonymous API requests are refused");
    const { data: recordable, error: recordableError } = await alice
      .from("consultations")
      .insert({ patient_id: patientIds[0] })
      .select()
      .single();
    assert.equal(recordableError, null);
    const transcribeForm = (audio?: Blob) => {
      const body = new FormData();
      body.set("consultationId", recordable!.id);
      if (audio) body.set("audio", audio, "recording.webm");
      return body;
    };
    const recording = new Blob([new Uint8Array([26, 69, 223, 163, 1, 2])], {
      type: "audio/webm;codecs=opus",
    });
    assert.equal(
      (
        await request("/api/transcribe", {
          method: "POST",
          body: transcribeForm(recording),
        })
      ).status,
      401,
      "Anonymous uploads are refused",
    );
    response = await request("/patients");
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/login");
    response = await request("/ideas");
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/login");
    const login = await (await request("/login")).text();
    response = await submit("/login", login, "form", { email: aliceEmail });
    const sentHtml = await response.text();
    assert.ok(
      sentHtml.includes("Check your email"),
      "OTP request succeeds through the real Server Action",
    );
    const inbox = local.MAILPIT_URL || local.INBUCKET_URL;
    async function getCode(email: string) {
      let code = "";
      for (let attempt = 0; attempt < 30 && !code; attempt++) {
        const messages = await (await fetch(`${inbox}/api/v1/messages`)).json();
        const message = messages.messages?.find(
          (item: { To: { Address: string }[] }) =>
            item.To.some((to) => to.Address === email),
        );
        if (message) {
          const body = await (
            await fetch(`${inbox}/api/v1/message/${message.ID}`)
          ).json();
          code = String(body.Text || body.HTML).match(/\b\d{6}\b/)?.[0] ?? "";
        }
        if (!code) await new Promise((resolve) => setTimeout(resolve, 200));
      }
      assert.ok(code, "Sign-in email contains a code");
      return code;
    }
    const code = await getCode(aliceEmail);
    response = await submit(
      "/login",
      sentHtml,
      'form:has(input[name="code"])',
      { email: aliceEmail, code },
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/dashboard");
    response = await request(`/api/patients/${patientIds[0]}`);
    assert.equal(response.status, 200, "Clinicians can read patients via the API");
    const { data: apiRecord } = await response.json();
    assert.equal(apiRecord.patient.lastName, `Demo-${run}`);
    response = await request(`/api/patients/${patientIds[0]}/consultations`);
    const { data: apiTimeline } = await response.json();
    assert.equal(
      apiTimeline.find((item: { id: string }) => item.id === consultation!.id)
        .finalNote.plan,
      "Rest and fluids",
    );
    assert.equal(
      (
        await request("/api/transcribe", {
          method: "POST",
          body: transcribeForm(new Blob(["text"], { type: "text/plain" })),
        })
      ).status,
      400,
      "Non-audio uploads are rejected",
    );
    assert.equal(
      (
        await request("/api/transcribe", {
          method: "POST",
          body: transcribeForm(),
        })
      ).status,
      400,
      "A first transcription needs audio",
    );
    response = await request("/api/transcribe", {
      method: "POST",
      body: transcribeForm(recording),
    });
    assert.equal(response.status, 200, "Recording uploads and transcribes");
    const { data: transcribed } = await response.json();
    audioPaths.push(transcribed.audioPath);
    assert.ok(transcribed.audioPath.startsWith(`${recordable!.id}/`));
    assert.ok(transcribed.audioPath.endsWith(".webm"));
    assert.equal(transcribed.status, "transcribing");
    assert.ok(transcribed.transcript.length > 0);
    assert.equal(
      (await bob.from("consultations").select().eq("id", recordable!.id).single())
        .data?.transcript,
      transcribed.transcript,
      "The transcript persists and is shared",
    );
    assert.equal(
      (
        await request("/api/transcribe", {
          method: "POST",
          body: transcribeForm(recording),
        })
      ).status,
      409,
      "A second transcription is rejected",
    );
    const workspace = await (
      await request(`/consultations/${recordable!.id}`)
    ).text();
    assert.ok(workspace.includes("Raw transcript"));
    console.log(
      "PASS: consultation audio upload, persisted write-once transcript and workspace page",
    );
    response = await request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patientIds[0], title: "Chase CXR report", dueDate: "2020-01-01" }),
    });
    assert.equal(response.status, 201, "Clinicians can add tasks via the API");
    const { data: apiTask } = await response.json();
    assert.equal(apiTask.status, "open");
    response = await request("/api/tasks?view=open");
    assert.ok(
      (await response.json()).data.some((item: { id: string }) => item.id === apiTask.id),
      "Open tasks are listed",
    );
    const tasksPage = await (await request("/tasks?view=open")).text();
    assert.ok(tasksPage.includes("Chase CXR report") && tasksPage.includes("Overdue"));
    response = await request(`/api/tasks/${apiTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.status, "done");
    const handoverPage = await (await request("/handover?hours=24")).text();
    assert.ok(handoverPage.includes(`Demo-${run}`), "Recently seen patients appear in the handover");
    console.log("PASS: task API, tasks page and handover page");
    const { data: nhiPatient } = await admin.from("patients").select("nhi").eq("id", patientIds[0]).single();
    response = await request(`/api/patients?q=${nhiPatient!.nhi!.toLowerCase()}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data[0]?.id, patientIds[0], "Search finds a patient by NHI");
    response = await request(`/patients?q=${nhiPatient!.nhi}`);
    assert.ok([303, 307, 308].includes(response.status), "An exact NHI opens the patient record");
    assert.ok(response.headers.get("location")?.endsWith(`/patients/${patientIds[0]}`));
    const rosterPage = await (await request("/roster")).text();
    assert.ok(rosterPage.includes("On shift now"));
    console.log("PASS: NHI search and redirect, roster page");
    assert.equal(
      (await request(`/api/patients?q=Demo-${run}`)).status,
      400,
      "Search rejects non-name characters",
    );
    response = await request(`/api/patients?q=Integration`);
    assert.ok(
      (await response.json()).data.some(
        (item: { id: string }) => item.id === patientIds[0],
      ),
    );
    let html = await (await request("/ideas")).text();
    assert.ok(html.includes("A blank page."));
    response = await submit("/ideas", html, 'form:has(input[name="title"])', {
      title: "HTTP workflow idea",
      description: "Saved through a server action",
    });
    html = await response.text();
    assert.ok(html.includes("Idea added."));
    html = await (await request("/ideas")).text();
    assert.ok(html.includes("HTTP workflow idea"));
    const { data: saved } = await alice
      .from("ideas")
      .select()
      .eq("title", "HTTP workflow idea")
      .single();
    assert.ok(saved);
    response = await submit(
      "/ideas",
      html,
      `form:has(input[name="id"][value="${saved.id}"]):has(input[name="title"])`,
      { id: saved.id, title: "HTTP workflow edited", description: "Updated" },
    );
    assert.ok((await response.text()).includes("Changes saved."));
    html = await (await request("/ideas")).text();
    assert.ok(html.includes("HTTP workflow edited"));
    response = await submit(
      "/ideas",
      html,
      `form:has(input[name="id"][value="${saved.id}"]):not(:has(input[name="title"]))`,
      { id: saved.id },
    );
    assert.ok(response.ok);
    assert.equal(
      (await alice.from("ideas").select().eq("id", saved.id)).data?.length,
      0,
    );
    html = await (await request("/ideas")).text();
    response = await submit("/ideas", html, "header form", {});
    assert.equal(response.status, 303);
    assert.equal((await request("/ideas")).headers.get("location"), "/login");
    const newcomerEmail = `new-${run}@example.test`;
    const signupHtml = await (
      await submit("/login", await (await request("/login")).text(), "form", {
        email: newcomerEmail,
      })
    ).text();
    const { data: registered } = await admin.auth.admin.listUsers();
    const newcomer = registered.users.find(
      (user) => user.email === newcomerEmail,
    );
    assert.ok(newcomer, "First sign-in registers an account");
    userIds.push(newcomer.id);
    const signupCode = await getCode(newcomerEmail);
    const verifiedSignup = await submit(
      "/login",
      signupHtml,
      'form:has(input[name="code"])',
      { email: newcomerEmail, code: signupCode },
    );
    assert.equal(verifiedSignup.status, 303);
    assert.ok(
      (await (await request("/ideas")).text()).includes("A blank page."),
    );
    assert.equal(
      (await request("/api/patients")).status,
      403,
      "Signed-in non-clinicians are refused",
    );
    console.log(
      "PASS: first-time email-code signup and empty private workspace",
    );
    console.log(
      "PASS: production HTTP sign-in email/code, session cookies, protected route, empty state, create/read/update/delete and sign-out",
    );
    console.log(
      "PASS: clinical API returns 401 anonymous, 403 non-clinician, and shared records to clinicians",
    );
  } finally {
    server?.kill("SIGTERM");
    if (audioPaths.length)
      await admin.storage.from("consultation-audio").remove(audioPaths);
    if (patientIds.length)
      await admin.from("patients").delete().in("id", patientIds);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Integration test failed",
  );
  process.exitCode = 1;
});
